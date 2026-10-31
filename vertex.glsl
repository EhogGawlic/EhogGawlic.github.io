#version 300 es
in vec2 a_quad_pos;

in vec2 a_pos;
in float a_rad;
in vec4 a_color;
in vec4 a_outline;
in float a_edge;
uniform vec2 u_resolution;

out vec4 v_color;
out vec2 v_local_pos;
out vec4 v_outline;
out float v_edge;
void main() {
    v_color = a_color;
    v_local_pos = a_quad_pos;
    v_edge = a_edge;
    v_outline = a_outline;
    vec2 final_position = (a_quad_pos * a_rad) + a_pos;
    vec2 clip_position = (final_position / u_resolution) * 2.0 - 1.0;
    clip_position.y *= -1.0;
    
    gl_Position = vec4(clip_position, 0.0, 1.0);
}
