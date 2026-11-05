import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllVerticals,
  fetchGuideVerticals,
  tagGuideWithVerticals,
  fetchSuggestedEntitiesForGuide,
  fetchEntityTags,
  tagEntity,
  removeEntityTag,
  fetchEntityTagAuditTrail,
  type Vertical,
  type VerticalTag,
  type EntityType,
} from "@/utils/vertical-tagging-api";
import { toast } from "sonner";

// ============================================================================
// VERTICALS LIST
// ============================================================================

/**
 * Fetch all 14 available enterprise verticals.
 * Use this to populate multi-select dropdowns.
 */
export const useAllVerticals = () => {
  return useQuery<Vertical[]>({
    queryKey: ["verticals"],
    queryFn: fetchAllVerticals,
    staleTime: 1000 * 60 * 30, // 30 min — verticals rarely change
  });
};

// ============================================================================
// GUIDE VERTICALS
// ============================================================================

/**
 * Fetch verticals currently assigned to a guide.
 */
export const useGuideVerticals = (guideId?: string) => {
  return useQuery({
    queryKey: ["guide-verticals", guideId],
    queryFn: () => fetchGuideVerticals(guideId!),
    enabled: !!guideId,
  });
};

/**
 * Tag / update verticals on an existing guide.
 */
export const useTagGuideVerticals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      guideId,
      verticalKeys,
    }: {
      guideId: string;
      verticalKeys: string[];
    }) => tagGuideWithVerticals(guideId, verticalKeys),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["guide-verticals", variables.guideId],
      });
      queryClient.invalidateQueries({
        queryKey: ["guide-suggested-entities", variables.guideId],
      });
      toast.success("Verticals updated successfully");
    },
    onError: () => {
      toast.error("Failed to update verticals");
    },
  });
};

// ============================================================================
// SUGGESTED ENTITIES
// ============================================================================

/**
 * Fetch entities that share the same vertical tags as a guide.
 */
export const useSuggestedEntities = (
  guideId?: string,
  entityType?: string
) => {
  return useQuery({
    queryKey: ["guide-suggested-entities", guideId, entityType],
    queryFn: () => fetchSuggestedEntitiesForGuide(guideId!, entityType),
    enabled: !!guideId,
  });
};

// ============================================================================
// ENTITY TAGS
// ============================================================================

/**
 * Fetch tags currently on a knowledge entity.
 */
export const useEntityTags = (
  entityType?: EntityType,
  entityId?: string
) => {
  return useQuery<VerticalTag[]>({
    queryKey: ["entity-tags", entityType, entityId],
    queryFn: () => fetchEntityTags(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });
};

/**
 * Tag a knowledge entity with a vertical.
 */
export const useTagEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      verticalKey,
      tagSource = "manual",
    }: {
      entityType: EntityType;
      entityId: string;
      verticalKey: string;
      tagSource?: "manual" | "automated";
    }) => tagEntity(entityType, entityId, verticalKey, tagSource),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entity-tags", variables.entityType, variables.entityId],
      });
      toast.success("Tag added");
    },
    onError: () => {
      toast.error("Failed to add tag");
    },
  });
};

/**
 * Remove a tag from a knowledge entity.
 */
export const useRemoveEntityTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      verticalKey,
    }: {
      entityType: EntityType;
      entityId: string;
      verticalKey: string;
    }) => removeEntityTag(entityType, entityId, verticalKey),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entity-tags", variables.entityType, variables.entityId],
      });
      toast.success("Tag removed");
    },
    onError: () => {
      toast.error("Failed to remove tag");
    },
  });
};

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Fetch audit trail for an entity's vertical tags.
 */
export const useEntityTagAudit = (
  entityType?: EntityType,
  entityId?: string
) => {
  return useQuery({
    queryKey: ["entity-tag-audit", entityType, entityId],
    queryFn: () => fetchEntityTagAuditTrail(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });
};
