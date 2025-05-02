import bpy
import os
import tempfile
import base64
import json
import sys
import http.server
import socketserver
import traceback


def setup_scene():
    try:
        # Clear the scene
        for obj in bpy.data.objects:
            bpy.data.objects.remove(obj)

        # Add a camera
        bpy.ops.object.camera_add(location=(0, -5, 2), rotation=(1.2, 0, 0))
        camera = bpy.context.active_object
        bpy.context.scene.camera = camera

        # Set up render settings
        bpy.context.scene.render.engine = "CYCLES"
        bpy.context.scene.render.resolution_x = 800
        bpy.context.scene.render.resolution_y = 600
        bpy.context.scene.render.resolution_percentage = 100

        # Add a light
        bpy.ops.object.light_add(type="SUN", location=(0, 0, 5))

        # Set up world background
        bpy.context.scene.world.use_nodes = True
        bg = bpy.context.scene.world.node_tree.nodes["Background"]
        bg.inputs[0].default_value = (0.8, 0.8, 0.8, 1)

        print("Scene setup completed successfully")
    except Exception as e:
        print(f"Error in scene setup: {str(e)}")
        print(traceback.format_exc())
        raise


def get_or_add_modifier(obj_name, modifier_type, modifier_name_str):
    try:
        obj = bpy.data.objects[obj_name]  # Find the object
    except KeyError:
        print(f"Object '{obj_name}' not found.  Cannot add modifier.")
        return None

    modifier = obj.modifiers.get(modifier_name_str)
    if not modifier:
        modifier = obj.modifiers.new(name=modifier_name_str, type=modifier_type)
        print(f"Modifier '{modifier_name_str}' added to '{obj_name}'")
    return modifier


class BlenderRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/execute-blender":
            try:
                content_length = int(self.headers["Content-Length"])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data)
                commands = data["commands"]

                print("Received commands:", commands)  # Debug log

                # Set up the scene
                setup_scene()

                # Execute the commands
                try:
                    print("Executing commands...")
                    # Create a new context override
                    for window in bpy.context.window_manager.windows:
                        screen = window.screen
                        for area in screen.areas:
                            if area.type == "VIEW_3D":
                                override = {
                                    "window": window,
                                    "screen": screen,
                                    "area": area,
                                }
                                break

                    # Execute the commands with the proper context
                    if "override" in locals():
                        local_vars = {"bpy": bpy, "get_or_add_modifier": get_or_add_modifier}  # Add bpy and helper function
                        with bpy.context.temp_override(**override):
                            exec(commands, globals(), local_vars)  # Pass local_vars
                    else:
                        local_vars = {"bpy": bpy, "get_or_add_modifier": get_or_add_modifier}
                        exec(commands, globals(), local_vars)
                    print("Commands executed successfully")
                except Exception as e:
                    print("Error executing commands:", str(e))
                    print("Traceback:", traceback.format_exc())
                    raise
                # Create a temporary directory for the output
                with tempfile.TemporaryDirectory() as temp_dir:
                    print("Created temp directory:", temp_dir)  # Debug log

                    # Export the model as GLB
                    model_path = os.path.join(temp_dir, "model.glb")
                    print("Exporting model to:", model_path)  # Debug log
                    try:
                        bpy.ops.export_scene.gltf(filepath=model_path)
                        print("Model exported successfully")
                    except Exception as e:
                        print("Error exporting model:", str(e))
                        print(traceback.format_exc())
                        raise

                    # Create a preview image
                    preview_path = os.path.join(temp_dir, "preview.png")
                    print("Rendering preview to:", preview_path)  # Debug log
                    try:
                        bpy.ops.render.render()
                        bpy.data.images["Render Result"].save_render(
                            preview_path
                        )
                        print("Preview rendered successfully")
                    except Exception as e:
                        print("Error rendering preview:", str(e))
                        print(traceback.format_exc())
                        raise

                    # Read the files
                    try:
                        with open(model_path, "rb") as f:
                            model_data = base64.b64encode(f.read()).decode(
                                "utf-8"
                            )
                        with open(preview_path, "rb") as f:
                            preview_data = base64.b64encode(f.read()).decode(
                                "utf-8"
                            )
                        print("Files read and encoded successfully")
                    except Exception as e:
                        print("Error reading files:", str(e))
                        print(traceback.format_exc())
                        raise

                    response = {
                        "modelUrl": f"data:model/gltf-binary;base64,{model_data}",
                        "previewUrl": f"data:image/png;base64,{preview_data}",
                    }

                    self.send_response(200)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(response).encode())
            except Exception as e:
                print("Server error:", str(e))  # Debug log
                print("Traceback:", traceback.format_exc())  # Debug log
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {"error": str(e), "traceback": traceback.format_exc()}
                    ).encode()
                )


def main():
    PORT = 5001
    handler = BlenderRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
