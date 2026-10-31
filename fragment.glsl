#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_local_pos;
in vec4 v_outline;
in float v_edge;

out vec4 outColor;

void main() {
    float distance = length(v_local_pos);
    
    if (distance > 1.0) {
        discard;
    }
    
    float outer_alpha = 1.0 - smoothstep(0.98, 1.0, distance);
    
    float outline_start = 1.0 - v_edge;
    
    float outline_factor = smoothstep(outline_start - 0.02, outline_start, distance);
    
    vec4 final_color = mix(v_color, v_outline, outline_factor);
    
    float alpha = final_color.a * outer_alpha;

    outColor = vec4(final_color.rgb * alpha, alpha);
}
