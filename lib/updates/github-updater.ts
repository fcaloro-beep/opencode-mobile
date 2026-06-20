import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

const DEFAULT_REPOSITORY = 'fcaloro-beep/opencode-mobile';

type GitHubRelease = {
  assets?: Array<{
    browser_download_url?: string;
    name?: string;
  }>;
  body?: string;
  html_url?: string;
  name?: string;
  tag_name?: string;
};

export type UpdateInfo = {
  currentVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  releaseUrl: string;
  version: string;
};

export type UpdateCheckResult =
  | { status: 'available'; update: UpdateInfo }
  | { status: 'current'; currentVersion: string }
  | { status: 'unavailable'; currentVersion: string; message: string };

function versionParts(value: string) {
  return value
    .trim()
    .replace(/^v/i, '')
    .split(/[.-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(left: string, right: string) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

export function getCurrentVersion() {
  return Constants.expoConfig?.version || '0.0.0';
}

function getUpdateRepository() {
  const configured = Constants.expoConfig?.extra?.updateRepository;
  return typeof configured === 'string' && configured.includes('/') ? configured : DEFAULT_REPOSITORY;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  const repository = getUpdateRepository();

  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.status === 404) {
      return { status: 'current', currentVersion };
    }

    if (!response.ok) {
      throw new Error(`GitHub returned HTTP ${response.status}`);
    }

    const release = (await response.json()) as GitHubRelease;
    const version = release.tag_name?.replace(/^v/i, '') || '';
    const apk = (release.assets || []).find((asset) => asset.name?.toLowerCase().endsWith('.apk'));

    if (!version || !apk?.browser_download_url || !release.html_url) {
      return {
        status: 'unavailable',
        currentVersion,
        message: 'The latest release does not contain an installable APK.',
      };
    }

    if (compareVersions(version, currentVersion) <= 0) {
      return { status: 'current', currentVersion };
    }

    return {
      status: 'available',
      update: {
        currentVersion,
        downloadUrl: apk.browser_download_url,
        releaseNotes: release.body,
        releaseUrl: release.html_url,
        version,
      },
    };
  } catch (error) {
    return {
      status: 'unavailable',
      currentVersion,
      message: error instanceof Error ? error.message : 'Could not check for updates.',
    };
  }
}

export async function openUpdateDownload(update: UpdateInfo) {
  await Linking.openURL(update.downloadUrl);
}
