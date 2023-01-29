export const unstructureUserLink = (
  link: string
): { server: string; user: string } => {
  const actor = link.replace("https://", "");
  const splitActor = actor.split("/");
  const server = splitActor[0].toLowerCase();
  const user = splitActor[splitActor.length - 1].toLowerCase();
  return { server, user };
};