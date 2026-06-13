import Capacitor
import Foundation
import WidgetKit

@objc(NotesWidgetBridgePlugin)
public class NotesWidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotesWidgetBridgePlugin"
    public let jsName = "NotesWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setPayload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removePayload", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.health.framewise.notes"
    private let payloadKey = "_capacitor_widget.payload"

    @objc func setPayload(_ call: CAPPluginCall) {
        guard let value = call.getString("value") else {
            call.reject("Must provide a value")
            return
        }
        guard let defaults = UserDefaults(suiteName: appGroup) else {
            call.reject("Unable to open App Group defaults")
            return
        }

        defaults.set(value, forKey: payloadKey)
        defaults.synchronize()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func removePayload(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroup) else {
            call.reject("Unable to open App Group defaults")
            return
        }

        defaults.removeObject(forKey: payloadKey)
        defaults.synchronize()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
