// notes — home-screen widget (#119/#120). Add this file to a **Widget Extension**
// target in the Capacitor iOS project (see docs/widget-phase2-runbook.md). The web app
// shares a payload into the App Group; this widget fetches `widget_summary` live when the
// token is valid, and falls back to the cached values otherwise.
//
// Small family only (v1): a progress ring + "X/N left today" + today's focus, with
// all-done (✓ + quote), empty, and needs-open states.

import WidgetKit
import SwiftUI
import Foundation

// MARK: - Shared App Group payload (written by the app bridge)

private let appGroup = "group.health.framewise.notes"
// NotesWidgetBridgePlugin writes this exact key into the App Group suite.
private let payloadKey = "_capacitor_widget.payload"

private struct WidgetPayload: Decodable {
  let accessToken: String
  let expiresAt: Double          // unix seconds
  let supabaseUrl: String
  let supabaseAnonKey: String
  let day: String
  let done: Int
  let total: Int
  let focus: String?
  let quoteText: String
  let quoteAuthor: String
}

private func loadPayload() -> WidgetPayload? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: payloadKey),
        let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

private func localToday() -> String {
  let f = DateFormatter()
  f.calendar = .current
  f.timeZone = .current
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: Date())
}

// MARK: - Live fetch (widget_summary RPC)

private struct SummaryRow: Decodable {
  let done: Int
  let total: Int
  let focus_label: String?
}

private func fetchLive(_ p: WidgetPayload, day: String) async -> SummaryRow? {
  // Only call if the access token is still valid (the widget never refreshes tokens —
  // the app does, on open; #120). Otherwise we fall back to cached values.
  guard p.expiresAt > Date().timeIntervalSince1970 + 30,
        let url = URL(string: "\(p.supabaseUrl)/rest/v1/rpc/widget_summary") else { return nil }
  var req = URLRequest(url: url)
  req.httpMethod = "POST"
  req.setValue("application/json", forHTTPHeaderField: "Content-Type")
  req.setValue(p.supabaseAnonKey, forHTTPHeaderField: "apikey")
  req.setValue("Bearer \(p.accessToken)", forHTTPHeaderField: "Authorization")
  req.httpBody = try? JSONSerialization.data(withJSONObject: ["p_day": day])
  do {
    let (data, resp) = try await URLSession.shared.data(for: req)
    guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return nil }
    return try JSONDecoder().decode([SummaryRow].self, from: data).first
  } catch {
    return nil
  }
}

// MARK: - Timeline

enum WidgetState {
  case needsOpen
  case empty
  case progress(done: Int, total: Int, focus: String?)
  case allDone(quote: String, author: String)
}

struct NotesEntry: TimelineEntry {
  let date: Date
  let state: WidgetState
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> NotesEntry {
    NotesEntry(date: Date(), state: .progress(done: 3, total: 6, focus: "meditate"))
  }

  func getSnapshot(in context: Context, completion: @escaping (NotesEntry) -> Void) {
    let state = loadPayload().map { stateFrom(done: $0.done, total: $0.total, focus: $0.focus, quote: $0) }
    completion(NotesEntry(date: Date(), state: state ?? .needsOpen))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NotesEntry>) -> Void) {
    Task {
      let entry = await resolve()
      let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())
        ?? Date().addingTimeInterval(1800)
      completion(Timeline(entries: [entry], policy: .after(next)))
    }
  }

  private func resolve() async -> NotesEntry {
    guard let p = loadPayload() else { return NotesEntry(date: Date(), state: .needsOpen) }
    if let live = await fetchLive(p, day: localToday()) {
      return NotesEntry(date: Date(), state: stateFrom(done: live.done, total: live.total, focus: live.focus_label, quote: p))
    }
    return NotesEntry(date: Date(), state: stateFrom(done: p.done, total: p.total, focus: p.focus, quote: p))
  }

  private func stateFrom(done: Int, total: Int, focus: String?, quote p: WidgetPayload) -> WidgetState {
    if total == 0 { return .empty }
    if done >= total { return .allDone(quote: p.quoteText, author: p.quoteAuthor) }
    return .progress(done: done, total: total, focus: focus)
  }
}

// MARK: - Views

private let accent = Color(red: 0x3b / 255.0, green: 0x6e / 255.0, blue: 0xf0 / 255.0)
private let ink = Color(red: 0x1c / 255.0, green: 0x1c / 255.0, blue: 0x1e / 255.0)
private let ink3 = Color(red: 0x8a / 255.0, green: 0x8a / 255.0, blue: 0x93 / 255.0)
private let soft = Color(red: 0xee / 255.0, green: 0xf2 / 255.0, blue: 0xfe / 255.0)

private struct Ring: View {
  let progress: Double
  var body: some View {
    ZStack {
      Circle().stroke(Color(white: 0.91), lineWidth: 7)
      Circle().trim(from: 0, to: max(0.001, min(1, progress)))
        .stroke(accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
    .frame(width: 50, height: 50)
  }
}

struct NotesWidgetEntryView: View {
  var entry: NotesEntry

  var body: some View {
    switch entry.state {
    case .needsOpen:
      VStack(spacing: 6) {
        Text("notes").font(.system(size: 15, weight: .black)).foregroundColor(accent)
        Text("open to set up").font(.system(size: 12, weight: .bold)).foregroundColor(ink3)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)

    case .empty:
      VStack(alignment: .leading, spacing: 6) {
        Text("today").font(.system(size: 17, weight: .black)).foregroundColor(ink)
        Text("add your routine in notes").font(.system(size: 12, weight: .bold)).foregroundColor(ink3)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

    case let .progress(done, total, focus):
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 11) {
          Ring(progress: Double(done) / Double(max(total, 1)))
          VStack(alignment: .leading, spacing: 1) {
            Text("\(total - done)/\(total)").font(.system(size: 25, weight: .black)).foregroundColor(ink)
            Text("left today").font(.system(size: 11, weight: .bold)).foregroundColor(ink3)
          }
        }
        Spacer(minLength: 8)
        VStack(alignment: .leading, spacing: 1) {
          Text("FOCUS").font(.system(size: 9, weight: .black)).foregroundColor(accent).tracking(0.5)
          Text(focus ?? "all caught up").font(.system(size: 15, weight: .black)).foregroundColor(ink).lineLimit(1)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(soft)
        .cornerRadius(12)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

    case let .allDone(quote, author):
      VStack(spacing: 7) {
        Text("✓").font(.system(size: 28, weight: .bold))
        Text("all done").font(.system(size: 18, weight: .black))
        Text(quote).font(.system(size: 11)).italic().multilineTextAlignment(.center).lineLimit(3)
        Text("— \(author)").font(.system(size: 10, weight: .bold)).opacity(0.85)
      }
      .foregroundColor(.white)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(accent)
    }
  }
}

@main
struct NotesWidget: Widget {
  let kind = "NotesWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        NotesWidgetEntryView(entry: entry)
          .containerBackground(.white, for: .widget)
          .widgetURL(URL(string: "notes://today"))
      } else {
        NotesWidgetEntryView(entry: entry)
          .padding()
          .background(Color.white)
          .widgetURL(URL(string: "notes://today"))
      }
    }
    .configurationDisplayName("notes")
    .description("today's routine + focus")
    .supportedFamilies([.systemSmall])
  }
}
