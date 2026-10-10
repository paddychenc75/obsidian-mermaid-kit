import { type App, PluginSettingTab, Setting } from "obsidian";
import { t } from "./i18n";

export interface Settings {
  /** Draw diagrams in the colours and font of the active Obsidian theme. */
  matchTheme: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  matchTheme: true,
};

interface SettingsHost {
  settings: Settings;
  updateSettings(change: Partial<Settings>): Promise<void>;
}

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: ConstructorParameters<typeof PluginSettingTab>[1],
    private host: SettingsHost,
  ) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName(t("setMatchTheme"))
      .setDesc(t("setMatchThemeDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.matchTheme).onChange((value) => {
          void this.host.updateSettings({ matchTheme: value });
        }),
      );
  }
}
