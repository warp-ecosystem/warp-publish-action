import { hello } from "./01-hello-world.js";

export function getInfo() {
  return {
    id: Warp.meta.id,
    name: Warp.meta.name,
    blockIconURI: Warp.assets["hello-icon.svg"],
    blocks: [
      {
        opcode: "hello",
        blockType: Scratch.BlockType.REPORTER,
        text: "Hello!",
      },
    ],
  };
}
