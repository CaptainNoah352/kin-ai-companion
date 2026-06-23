export const driveVaultFileName = "kin-vault.enc.json";

const driveFilesUrl = "https://www.googleapis.com/drive/v3/files";
const driveUploadUrl = "https://www.googleapis.com/upload/drive/v3/files";

export async function findDriveVault(accessToken) {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${driveVaultFileName}' and trashed=false`,
    fields: "files(id,name,modifiedTime,size)",
  });
  const data = await driveFetch(`${driveFilesUrl}?${params}`, accessToken);
  return data.files?.[0] || null;
}

export async function downloadDriveVault(accessToken, fileId) {
  if (!fileId) return null;
  return driveFetch(`${driveFilesUrl}/${fileId}?alt=media`, accessToken);
}

export async function uploadDriveVault(accessToken, envelope, fileId = "") {
  const body = buildMultipartBody({
    metadata: {
      name: driveVaultFileName,
      parents: fileId ? undefined : ["appDataFolder"],
      mimeType: "application/json",
    },
    media: envelope,
  });
  const url = fileId
    ? `${driveUploadUrl}/${fileId}?uploadType=multipart&fields=id,name,modifiedTime,size`
    : `${driveUploadUrl}?uploadType=multipart&fields=id,name,modifiedTime,size`;
  return driveFetch(url, accessToken, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${body.boundary}`,
    },
    body: body.content,
  });
}

export async function deleteDriveVault(accessToken, fileId) {
  if (!fileId) return;
  await driveFetch(`${driveFilesUrl}/${fileId}`, accessToken, { method: "DELETE", expectJson: false });
}

async function driveFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive request failed (${response.status}). ${detail}`.trim());
  }

  if (options.expectJson === false || response.status === 204) return null;
  return response.json();
}

function buildMultipartBody({ metadata, media }) {
  const boundary = `kin-vault-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const content = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(media),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return { boundary, content };
}
