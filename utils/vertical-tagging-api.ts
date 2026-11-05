import { Axios } from "@/app/config/axios";

/**
 * Vertical Tagging API Utilities
 * 
 * This module provides all API integration functions for the Vertical Tagging Framework.
 * It handles communication with backend endpoints for managing enterprise vertical tags
 * across guides and knowledge entities.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Vertical {
    key: string;
    name: string;
    description: string;
}

export interface VerticalTag {
    id: string;
    entity_type: string;
    entity_id: string;
    vertical_key: string;
    vertical_name: string;
    vertical_description: string;
    company_id: string | null;
    tagged_by?: string;
    tag_source: "manual" | "automated";
    created_at: string;
    is_active?: boolean;
}

export interface GuideVertical extends VerticalTag {
    guide_id: string;
    guide_name: string;
}

export interface EntityWithVerticals {
    id: string;
    entity_type: string;
    entity_id: string;
    vertical_key: string;
    vertical_name: string;
    vertical_description: string;
    company_id: string | null;
    tag_source: "manual" | "automated";
    created_at: string;
}

export interface SuggestedEntity {
    id: string;
    entity_type: string;
    entity_id: string;
    vertical_key: string;
    vertical_name: string;
    vertical_description: string;
    company_id: string | null;
    tag_source: "manual" | "automated";
    created_at: string;
}

export interface AuditLogEntry {
    action: "tag_added" | "tag_removed";
    vertical_key: string;
    performed_by?: string;
    created_at: string;
}

// ============================================================================
// ENDPOINT 1: Get All Available Verticals
// ============================================================================

/**
 * Fetches all 14 available enterprise verticals
 * Use this to populate multi-select dropdowns when creating or editing a guide.
 * 
 * @returns Promise<Vertical[]> Array of all available verticals
 */
export const fetchAllVerticals = async (): Promise<Vertical[]> => {
    const response = await Axios.get("/data/knowledge-graph/verticals");
    return response.data?.verticals || [];
};

// ============================================================================
// ENDPOINT 2 & 3: Guide Creation with Verticals
// ============================================================================

/**
 * Create a guide with vertical tags
 * The guide will be auto-tagged with the specified verticals on creation.
 * 
 * @param guideData Guide creation data including optional vertical_keys
 * @returns Promise with created guide data including assigned verticals
 */
export const createGuideWithVerticals = async (guideData: {
    name: string;
    description: string;
    vertical_keys?: string[];
    [key: string]: any;
}) => {
    const response = await Axios.post("/data/guides/", guideData);
    return response.data;
};

/**
 * Create a guide from a prompt with vertical tags
 * AI-generated guide will be auto-tagged with specified verticals.
 * 
 * @param promptData Prompt-based guide creation data
 * @returns Promise with created guide data
 */
export const createGuideFromPromptWithVerticals = async (promptData: {
    agent_name: string;
    prompt: string;
    vertical_keys?: string[];
    [key: string]: any;
}) => {
    const response = await Axios.post("/data/guides/from-prompt", promptData);
    return response.data;
};

// ============================================================================
// ENDPOINT 4: Tag an Existing Guide with Verticals
// ============================================================================

/**
 * Add or update vertical tags for an existing guide
 * This is idempotent - tagging the same vertical twice won't create duplicates.
 * 
 * @param guideId The guide's ID
 * @param verticalKeys Array of vertical keys to assign (e.g., ["finance", "sales"])
 * @returns Promise with guide_id and tagged_verticals
 */
export const tagGuideWithVerticals = async (
    guideId: string,
    verticalKeys: string[]
): Promise<{ guide_id: string; tagged_verticals: string[] }> => {
    const response = await Axios.post(
        `/data/guides/${guideId}/verticals`,
        { vertical_keys: verticalKeys }
    );
    return response.data;
};

// ============================================================================
// ENDPOINT 5: Get Guide's Current Verticals
// ============================================================================

/**
 * Fetch the current vertical tags assigned to a guide
 * Use this to show which verticals are currently selected on a guide detail/edit page.
 * 
 * @param guideId The guide's ID
 * @returns Promise<GuideVertical[]> Array of vertical tags assigned to the guide
 */
export const fetchGuideVerticals = async (guideId: string): Promise<GuideVertical[]> => {
    const response = await Axios.get(`/data/guides/${guideId}/verticals`);
    return response.data?.verticals || [];
};

// ============================================================================
// ENDPOINT 6: Auto-Discover Suggested Entities for a Guide
// ============================================================================

/**
 * Returns all knowledge entities that share the same vertical tags as a given guide.
 * The guide itself is excluded from results.
 * Use this to show a "Suggested Data Assets" panel.
 * 
 * @param guideId The guide's ID
 * @param entityType Optional filter by entity type (e.g., "db_table", "dataset")
 * @returns Promise with guide verticals and matching entities
 */
export const fetchSuggestedEntitiesForGuide = async (
    guideId: string,
    entityType?: string
): Promise<{
    guide_id: string;
    verticals: string[];
    count: number;
    entities: SuggestedEntity[];
}> => {
    let url = `/data/guides/${guideId}/verticals/entities`;
    if (entityType) {
        url += `?entity_type=${entityType}`;
    }
    const response = await Axios.get(url);
    return response.data;
};

// ============================================================================
// ENDPOINT 7: Tag a Knowledge Entity
// ============================================================================

export type EntityType =
    | "db_table"
    | "dataset"
    | "glossary"
    | "document"
    | "db_schema"
    | "column"
    | "process"
    | "application"
    | "policy"
    | "model"
    | "dashboard";

/**
 * Tag a knowledge entity (table, dataset, document, etc.) with a vertical
 * 
 * @param entityType Type of entity being tagged
 * @param entityId ID of the entity
 * @param verticalKey The vertical key to assign (e.g., "finance")
 * @param tagSource Whether this is a manual or automated tag
 * @param companyId Optional company ID for multi-tenant isolation
 * @param taggedBy Optional user ID of who performed the tagging
 * @returns Promise<VerticalTag> The created tag
 */
export const tagEntity = async (
    entityType: EntityType,
    entityId: string,
    verticalKey: string,
    tagSource: "manual" | "automated" = "manual",
    companyId?: string,
    taggedBy?: string
): Promise<VerticalTag> => {
    const response = await Axios.post(
        `/data/knowledge-graph/tags/${entityType}/${entityId}`,
        {
            vertical_key: verticalKey,
            company_id: companyId || null,
            tagged_by: taggedBy || null,
            tag_source: tagSource,
        }
    );
    return response.data;
};

// ============================================================================
// ENDPOINT 8: Get Tags on an Entity
// ============================================================================

/**
 * Fetch all vertical tags assigned to a knowledge entity
 * 
 * @param entityType Type of entity
 * @param entityId ID of the entity
 * @returns Promise<VerticalTag[]> Array of tags assigned to the entity
 */
export const fetchEntityTags = async (
    entityType: EntityType,
    entityId: string
): Promise<VerticalTag[]> => {
    const response = await Axios.get(`/data/knowledge-graph/tags/${entityType}/${entityId}`);
    return response.data?.tags || [];
};

// ============================================================================
// ENDPOINT 9: Remove a Tag from an Entity
// ============================================================================

/**
 * Remove a vertical tag from an entity (soft delete)
 * This sets is_active=false and writes to the audit trail.
 * 
 * @param entityType Type of entity
 * @param entityId ID of the entity
 * @param verticalKey The vertical key to remove
 * @param performedBy Optional user ID of who performed the removal
 * @returns Promise with confirmation
 */
export const removeEntityTag = async (
    entityType: EntityType,
    entityId: string,
    verticalKey: string,
    performedBy?: string
): Promise<{ detail: string }> => {
    let url = `/data/knowledge-graph/tags/${entityType}/${entityId}/${verticalKey}`;
    if (performedBy) {
        url += `?performed_by=${performedBy}`;
    }
    const response = await Axios.delete(url);
    return response.data;
};

// ============================================================================
// ENDPOINT 10: Get All Entities Tagged with a Vertical
// ============================================================================

/**
 * Get all entities tagged with a specific vertical
 * Useful for discovering all data assets related to a business area
 * 
 * @param verticalKey The vertical key (e.g., "finance")
 * @param entityType Optional filter by entity type
 * @param companyId Optional filter by company ID
 * @returns Promise with vertical key and matching entities
 */
export const fetchEntitiesByVertical = async (
    verticalKey: string,
    entityType?: EntityType,
    companyId?: string
): Promise<{
    vertical_key: string;
    count: number;
    entities: EntityWithVerticals[];
}> => {
    let url = `/data/knowledge-graph/verticals/${verticalKey}/entities`;
    const params: string[] = [];

    if (entityType) params.push(`entity_type=${entityType}`);
    if (companyId) params.push(`company_id=${companyId}`);

    if (params.length > 0) {
        url += `?${params.join("&")}`;
    }

    const response = await Axios.get(url);
    return response.data;
};

// ============================================================================
// ENDPOINT 11: Get Audit Trail
// ============================================================================

/**
 * Fetch audit trail for an entity's vertical tags (admin only)
 * Returns all tag/untag events in reverse chronological order
 * 
 * @param entityType Type of entity
 * @param entityId ID of the entity
 * @returns Promise with audit log entries
 */
export const fetchEntityTagAuditTrail = async (
    entityType: EntityType,
    entityId: string
): Promise<{
    entity_type: EntityType;
    entity_id: string;
    count: number;
    audit_log: AuditLogEntry[];
}> => {
    const response = await Axios.get(`/data/knowledge-graph/tags/audit/${entityType}/${entityId}`);
    return response.data;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Batch tag multiple entities with the same vertical
 * Useful for bulk operations on related entities
 * 
 * @param entities Array of {entityType, entityId} tuples
 * @param verticalKey The vertical to assign
 * @param tagSource Whether this is manual or automated
 * @returns Promise[] Array of tagging promises
 */
export const batchTagEntities = async (
    entities: Array<{ entityType: EntityType; entityId: string }>,
    verticalKey: string,
    tagSource: "manual" | "automated" = "manual"
) => {
    return Promise.all(
        entities.map((entity) =>
            tagEntity(entity.entityType, entity.entityId, verticalKey, tagSource)
        )
    );
};

/**
 * Batch remove a vertical tag from multiple entities
 * 
 * @param entities Array of {entityType, entityId} tuples
 * @param verticalKey The vertical to remove
 * @returns Promise[] Array of removal promises
 */
export const batchRemoveEntityTags = async (
    entities: Array<{ entityType: EntityType; entityId: string }>,
    verticalKey: string
) => {
    return Promise.all(
        entities.map((entity) =>
            removeEntityTag(entity.entityType, entity.entityId, verticalKey)
        )
    );
};

/**
 * Check if an entity already has a specific vertical tag
 * 
 * @param entityType Type of entity
 * @param entityId ID of the entity
 * @param verticalKey The vertical to check for
 * @returns Promise<boolean> True if tag exists and is active
 */
export const entityHasVerticalTag = async (
    entityType: EntityType,
    entityId: string,
    verticalKey: string
): Promise<boolean> => {
    const tags = await fetchEntityTags(entityType, entityId);
    return tags.some(
        (tag) => tag.vertical_key === verticalKey && tag.is_active !== false
    );
};

/**
 * Get the count of entities tagged with a specific vertical
 * 
 * @param verticalKey The vertical key
 * @returns Promise<number> Count of tagged entities
 */
export const countEntitiesByVertical = async (verticalKey: string): Promise<number> => {
    const result = await fetchEntitiesByVertical(verticalKey);
    return result.count;
};
