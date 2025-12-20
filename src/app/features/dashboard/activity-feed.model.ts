export type ActivitySource = 'users' | 'places' | 'adsz';

export interface ActivityFeedItem {
    key: string;
    source: ActivitySource;
    id: string;
    name: string;
    text: string;
    icon: string;
    color: string;
    timestamp: number;
    route: string;
    avatarText?: string;
}
