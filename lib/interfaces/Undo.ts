import { AddFollower } from "./AddFollower";

export interface Undo {
  "@context": string;
  actor: string;
  id: string;
  object: AddFollower;
  type: "Undo";
}
