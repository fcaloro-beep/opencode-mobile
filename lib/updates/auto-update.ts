import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

import { checkForUpdate, openUpdateDownload } from '@/lib/updates/github-updater';

const LAST_CHECK_KEY = 'opencode-mobile:last-update-check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
let activeCheck: Promise<void> | undefined;

async function runAutomaticCheck() {
  if (Platform.OS !== 'android') {
    return;
  }

  const lastCheck = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
    return;
  }

  await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  const result = await checkForUpdate();
  if (result.status !== 'available') {
    return;
  }

  Alert.alert(
    `OpenCode Mobile ${result.update.version} available`,
    `Installed version: ${result.update.currentVersion}. Android will ask you to confirm the installation.`,
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Update',
        onPress: () => {
          void openUpdateDownload(result.update);
        },
      },
    ],
  );
}

export function initializeAutomaticUpdateCheck() {
  if (!activeCheck) {
    activeCheck = runAutomaticCheck().finally(() => {
      activeCheck = undefined;
    });
  }

  return activeCheck;
}
