import { getClient } from "./mtproto-client.js";
import { Api } from "telegram";

export async function downloadDocument(fileRef) {
  const client = await getClient();

  const buffer = await client.downloadFile(
    new Api.InputDocumentFileLocation({
      id: BigInt(fileRef.id),
      accessHash: BigInt(fileRef.accessHash),
      fileReference: Buffer.alloc(0),
      thumbSize: "",
    }),
    {
      dcId: fileRef.dcId || 2,
      fileSize: 512 * 1024,
    }
  );

  return Buffer.from(buffer);
}
