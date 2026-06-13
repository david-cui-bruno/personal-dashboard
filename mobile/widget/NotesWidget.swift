// notes — home-screen widget (#119/#120). Add this file to a **Widget Extension**
// target in the Capacitor iOS project (see docs/widget-phase2-runbook.md). The web app
// shares a payload into the App Group; this widget fetches `widget_summary` live when the
// token is valid, and falls back to the cached values otherwise.
//
// Home screen (systemSmall): a progress ring + "X/N left today" + today's focus, with
// all-done (✓ + quote), empty, and needs-open states.
// Lock screen (iOS 16+, #138): accessoryCircular (a done/total gauge), accessoryRectangular
// ("X/N done" + focus), and accessoryInline ("N left"). Same data + states; rendered
// monochrome/system-tinted, so no custom colors — `widgetAccentable()` marks the tinted bits.

import WidgetKit
import SwiftUI
import Foundation

// MARK: - Shared App Group payload (written by the web app via @capacitor/preferences)

private let appGroup = "group.health.framewise.notes"
// Capacitor Preferences prefixes stored keys with "_capacitor_".
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

// Home-screen small widget (the original v1 design).
struct HomeView: View {
  let state: WidgetState

  var body: some View {
    switch state {
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

// MARK: - Lock-screen (accessory) widgets, iOS 16+ (#138)
// Rendered monochrome and system-tinted; no custom colors. `widgetAccentable()`
// marks the parts that take the user's lock-screen tint.

@available(iOS 16.0, *)
struct AccessoryInlineView: View {
  let state: WidgetState
  var body: some View {
    switch state {
    case .needsOpen, .empty:
      Label("open notes", systemImage: "checklist")
    case let .progress(done, total, _):
      Label("\(total - done) of \(total) left", systemImage: "checklist")
    case .allDone:
      Label("all done", systemImage: "checkmark.circle.fill")
    }
  }
}

@available(iOS 16.0, *)
struct AccessoryCircularView: View {
  let state: WidgetState
  var body: some View {
    switch state {
    case let .progress(done, total, _):
      Gauge(value: Double(done), in: 0...Double(max(total, 1))) {
        Text("done")
      } currentValueLabel: {
        Text("\(done)")
      }
      .gaugeStyle(.accessoryCircularCapacity)
    case .allDone:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "checkmark").font(.system(size: 20, weight: .bold)).widgetAccentable()
      }
    case .empty, .needsOpen:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "checklist")
      }
    }
  }
}

@available(iOS 16.0, *)
struct AccessoryRectangularView: View {
  let state: WidgetState
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      switch state {
      case .needsOpen:
        Text("notes").font(.headline)
        Text("open to set up").font(.caption)
      case .empty:
        Text("today").font(.headline)
        Text("add your routine").font(.caption)
      case let .progress(done, total, focus):
        Text("\(done)/\(total) done").font(.headline).widgetAccentable()
        Text(focus.map { "focus: \($0)" } ?? "keep going").font(.caption).lineLimit(1)
      case let .allDone(quote, _):
        Label("all done", systemImage: "checkmark.circle.fill").font(.headline).widgetAccentable()
        Text(quote).font(.caption2).lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - Family dispatch

struct NotesWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  var entry: NotesEntry

  var body: some View {
    if #available(iOS 16.0, *), family == .accessoryInline {
      AccessoryInlineView(state: entry.state).widgetURL(URL(string: "notes://today"))
    } else if #available(iOS 16.0, *), family == .accessoryCircular {
      AccessoryCircularView(state: entry.state).widgetURL(URL(string: "notes://today"))
    } else if #available(iOS 16.0, *), family == .accessoryRectangular {
      AccessoryRectangularView(state: entry.state).widgetURL(URL(string: "notes://today"))
    } else if #available(iOS 17.0, *) {
      HomeView(state: entry.state)
        .containerBackground(.white, for: .widget)
        .widgetURL(URL(string: "notes://today"))
    } else {
      HomeView(state: entry.state)
        .padding()
        .background(Color.white)
        .widgetURL(URL(string: "notes://today"))
    }
  }
}

private func supportedWidgetFamilies() -> [WidgetFamily] {
  if #available(iOS 16.0, *) {
    return [.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline]
  }
  return [.systemSmall]
}

@main
struct NotesWidget: Widget {
  let kind = "NotesWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      NotesWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("notes")
    .description("today's routine + focus")
    .supportedFamilies(supportedWidgetFamilies())
  }
}
