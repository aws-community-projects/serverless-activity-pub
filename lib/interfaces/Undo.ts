import { Follow } from "./AddFollower";

export interface Undo {
  "@context": string;
  actor: string;
  id: string;
  object: Follow;
  type: "Undo";
}
