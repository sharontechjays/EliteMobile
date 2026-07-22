export interface MediaItem {
  kind: "photo" | "video";
  uri: string;
  width: number;
  height: number;
  thumbnailUri: string;
}
