import * as BABYLON from "https://esm.sh/@babylonjs/core@5.43.1/Legacy/legacy";

const canvas = document.querySelector("#game-canvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);

const createScene = function () {
  // Creates a basic Babylon Scene object
  const scene = new BABYLON.Scene(engine);
  // Creates and positions a free camera
  const camera = new BABYLON.FreeCamera(
    "camera1",
    new BABYLON.Vector3(0, 5, -10),
    scene
  );
  // Targets the camera to scene origin
  camera.setTarget(BABYLON.Vector3.Zero());
  // Attaches the camera to the canvas
  camera.attachControl(canvas, true);
  // Creates a light, aiming 0,1,0
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  // Dim the light a small amount 0 - 1
  light.intensity = 0.7;
  // Built-in 'sphere' shape.
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 2, segments: 32 },
    scene
  );
  // Move phere upward 1/2 its height
  sphere.position.y = 1;
  // Built-in 'ground' shape.
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 6, height: 6 },
    scene
  );

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});
