import { type App, type Plugin, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
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
    plugin: Plugin,
    private host: SettingsHost,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof Settings>[] {
    return [
      {
        name: t("setMatchTheme"),
        desc: t("setMatchThemeDesc"),
        control: { type: "toggle", key: "matchTheme", defaultValue: DEFAULT_SETTINGS.matchTheme },
      },
    ];
  }

  getControlValue(key: string): unknown {
    return this.host.settings[key as keyof Settings];
  }

  /** Routed through the plugin, which also has to act on a change, not only store it. */
  setControlValue(key: string, value: unknown): Promise<void> {
    return this.host.updateSettings({ [key]: value });
  }
}
