export type MissionStatus = 'draft' | 'planned' | 'active' | 'done' | 'cancelled';

export interface MissionDoc {
    id: string;

    title: string;
    description?: string;

    placeId: string;
    assignedPersonIds: string[];

    startAt: number;
    endAt: number;

    status: MissionStatus;

    createdAt: number;
    updatedAt: number;
    createdBy: string;
    updatedBy?: string;
}
