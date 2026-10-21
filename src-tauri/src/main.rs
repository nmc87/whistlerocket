// Geen extra consolevenster in de release-versie op Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    whistlerocket_lib::run()
}
