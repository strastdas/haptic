import { collection, appSettings, collectionSettings } from '@/store';
import type { AppSettingsParams, CollectionSettingsParams } from '@/types';
import { appDataDir } from '@tauri-apps/api/path';
import { BaseDirectory, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { get } from 'svelte/store';

export const loadSettings = async (loadApp: boolean, loadCollection: boolean) => {
  if (loadApp) {
    const appSettingsPath = 'settings.json';
    const appSettingsText = await readTextFile(appSettingsPath, {
      baseDir: BaseDirectory.AppData
    }).catch(() => null);

    if (appSettingsText) {
      appSettings.set(JSON.parse(appSettingsText));
    } else {
      setSettings('app');
    }
  }

  if (loadCollection) {
    const collectionSettingsPath = `${get(collection)}/.haptic/settings.json`;
    const collectionSettingsText = await readTextFile(collectionSettingsPath).catch(() => null);
    if (collectionSettingsText) {
      collectionSettings.set(JSON.parse(collectionSettingsText));
    } else {
      setSettings('collection');
    }
  }
};

export const setSettings = async (
  settingsType: 'app' | 'collection',
  value?: AppSettingsParams | CollectionSettingsParams
) => {
  if (settingsType === 'app') {
    const appSettingsPath = 'settings.json';
    const appSettingsText = JSON.stringify(value ?? get(appSettings));
    appSettings.set((value ?? get(appSettings)) as AppSettingsParams);
    // v2's writeTextFile does not create parent directories; make sure the
    // app data dir exists before the first write on a fresh install.
    await mkdir(await appDataDir(), { recursive: true }).catch(() => null);
    await writeTextFile(appSettingsPath, appSettingsText, {
      baseDir: BaseDirectory.AppData
    });
  }

  if (settingsType === 'collection') {
    const collectionSettingsPath = `${get(collection)}/.haptic/settings.json`;
    const collectionSettingsText = JSON.stringify(value ?? get(collectionSettings));
    collectionSettings.set((value ?? get(collectionSettings)) as CollectionSettingsParams);
    await writeTextFile(collectionSettingsPath, collectionSettingsText);
  }
};
