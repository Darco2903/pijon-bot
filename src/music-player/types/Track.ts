export type Track = {
    id: string;
    title: string;
    webpage_url: string;
    duration?: number | null | undefined;
    channel?: string | null | undefined;
    uploader?: string | null | undefined;
    thumbnail?: string | null | undefined;
    is_live?: boolean | null | undefined;
};
