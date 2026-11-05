import { DotPosition } from "./types";

export const saveBigQueryState = (connected: boolean, companyId: string | number) => {
    if (typeof window === "undefined") return;
    const key = `bigquery_connected_${companyId}`;
    const data = {
        connected,
        timestamp: Date.now(),
        companyId,
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const loadBigQueryState = (companyId: string | number): boolean => {
    if (typeof window === "undefined") return false;
    const key = `bigquery_connected_${companyId}`;
    const item = localStorage.getItem(key);
    if (!item) return false;
    try {
        const data = JSON.parse(item);
        return !!data.connected;
    } catch {
        return false;
    }
};

export const saveNetSuiteState = (connected: boolean, companyId: string | number) => {
    if (typeof window === "undefined") return;
    const key = `netsuite_connected_${companyId}`;
    const data = {
        connected,
        timestamp: Date.now(),
        companyId,
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const loadNetSuiteState = (companyId: string | number): boolean => {
    if (typeof window === "undefined") return false;
    const key = `netsuite_connected_${companyId}`;
    const item = localStorage.getItem(key);
    if (!item) return false;
    try {
        const data = JSON.parse(item);
        return !!data.connected;
    } catch {
        return false;
    }
};

export const saveAirtableState = (connected: boolean, companyId: string | number) => {
    if (typeof window === "undefined") return;
    const key = `airtable_connected_${companyId}`;
    const data = {
        connected,
        timestamp: Date.now(),
        companyId,
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const loadAirtableState = (companyId: string | number): boolean => {
    if (typeof window === "undefined") return false;
    const key = `airtable_connected_${companyId}`;
    const item = localStorage.getItem(key);
    if (!item) return false;
    try {
        const data = JSON.parse(item);
        return !!data.connected;
    } catch {
        return false;
    }
};

export const saveNotionState = (connected: boolean, companyId: string | number) => {
    if (typeof window === "undefined") return;
    const key = `notion_connected_${companyId}`;
    const data = {
        connected,
        timestamp: Date.now(),
        companyId,
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const loadNotionState = (companyId: string | number): boolean => {
    if (typeof window === "undefined") return false;
    const key = `notion_connected_${companyId}`;
    const item = localStorage.getItem(key);
    if (!item) return false;
    try {
        const data = JSON.parse(item);
        return !!data.connected;
    } catch {
        return false;
    }
};

export const saveGoogleDriveState = (connected: boolean, companyId: string | number) => {
    if (typeof window === "undefined") return;
    const key = `gdrive_connected_${companyId}`;
    const data = {
        connected,
        timestamp: Date.now(),
        companyId,
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const loadGoogleDriveState = (companyId: string | number): boolean => {
    if (typeof window === "undefined") return false;
    const key = `gdrive_connected_${companyId}`;
    const item = localStorage.getItem(key);
    if (!item) return false;
    try {
        const data = JSON.parse(item);
        return !!data.connected;
    } catch {
        return false;
    }
};

// Generate some static dot positions
export const outerDots: DotPosition[] = [
    { x: "15%", y: "20%", size: 4, opacity: 0.6 },
    { x: "85%", y: "15%", size: 3, opacity: 0.5 },
    { x: "50%", y: "90%", size: 5, opacity: 0.7 },
    { x: "20%", y: "80%", size: 3, opacity: 0.4 },
    { x: "80%", y: "75%", size: 4, opacity: 0.6 },
    { x: "10%", y: "50%", size: 2, opacity: 0.3 },
    { x: "90%", y: "40%", size: 3, opacity: 0.5 },
    { x: "35%", y: "10%", size: 4, opacity: 0.6 },
    { x: "65%", y: "95%", size: 2, opacity: 0.4 },
    { x: "5%", y: "30%", size: 3, opacity: 0.5 },
    { x: "10%", y: "10%", size: 3, opacity: 0.4 },
    { x: "90%", y: "90%", size: 4, opacity: 0.5 },
    { x: "40%", y: "5%", size: 2, opacity: 0.3 },
    { x: "60%", y: "5%", size: 3, opacity: 0.4 },
    { x: "5%", y: "60%", size: 2, opacity: 0.3 },
    { x: "95%", y: "60%", size: 3, opacity: 0.5 },
];

export const middleDots: DotPosition[] = [
    { x: "30%", y: "25%", size: 4, opacity: 0.8 },
    { x: "70%", y: "30%", size: 3, opacity: 0.7 },
    { x: "50%", y: "80%", size: 5, opacity: 0.9 },
    { x: "25%", y: "60%", size: 3, opacity: 0.6 },
    { x: "75%", y: "65%", size: 4, opacity: 0.8 },
    { x: "40%", y: "15%", size: 3, opacity: 0.7 },
    { x: "60%", y: "85%", size: 4, opacity: 0.8 },
    { x: "15%", y: "50%", size: 3, opacity: 0.7 },
    { x: "85%", y: "50%", size: 3, opacity: 0.7 },
    { x: "50%", y: "20%", size: 4, opacity: 0.8 },
];

export const innerDots: DotPosition[] = [
    { x: "45%", y: "45%", size: 3, opacity: 1 },
    { x: "55%", y: "55%", size: 3, opacity: 1 },
    { x: "40%", y: "60%", size: 2, opacity: 0.9 },
    { x: "60%", y: "40%", size: 2, opacity: 0.9 },
    { x: "50%", y: "35%", size: 3, opacity: 1 },
    { x: "35%", y: "50%", size: 2, opacity: 0.9 },
    { x: "65%", y: "50%", size: 2, opacity: 0.9 },
];

export const whiteCircleDots: DotPosition[] = [
    { x: "50%", y: "10%", size: 4, opacity: 1 },
    { x: "90%", y: "50%", size: 3, opacity: 0.8 },
    { x: "50%", y: "90%", size: 4, opacity: 1 },
    { x: "10%", y: "50%", size: 3, opacity: 0.8 },
];

export const formatMessageContent = (content: string) => {
    if (!content) return "";
    // Fix cases where list items are in a single paragraph: "Item: - point1 - point2"
    // Look for " - " that is not at the start of a line and preceded by text.
    let formatted = content.replace(/([^\n])\s+-\s/g, "$1\n- ");

    // Also handle cases like "I can: - Point"
    formatted = formatted.replace(/:\s+-\s/g, ":\n- ");

    return formatted;
};
