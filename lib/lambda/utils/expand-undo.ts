import { unstructureUserLink } from "./unstructure-user-link";

export const expandUndo = (
  activity: any
): { targetServer?: string; targetUser?: string; type?: string } => {
  if (activity.type.toLowerCase() !== "undo") {
    return {};
  }
  const { server: targetServer, user: targetUser } = unstructureUserLink(
    activity.object.object
  );
  return {
    type: activity.object.type.toLowerCase(),
    targetServer,
    targetUser,
  };
};
