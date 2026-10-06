#define WASM_EXPORT extern "C" __attribute__((visibility("default")))
#include <stdint.h>

static uint64_t state0 = 0x123456789ABCDEF0ULL;
static uint64_t state1 = 0xFEDCBA9876543210ULL;

static uint64_t xorshift128plus(void) {
    uint64_t s1 = state0;
    const uint64_t s0 = state1;
    state0 = s0;
    s1 ^= s1 << 23; // shift a
    state1 = s1 ^ s0 ^ (s1 >> 18) ^ (s0 >> 5); // shift b, shift c
    return state1 + s0;
}

static float randomFloat() {
    return (float)(xorshift128plus() & 0xFFFFFFFF) / (float)0x100000000;
}

static constexpr int BALL_STRIDE = 7;

static void collideBalls(float* a, float* b){
    float dx = a[0] - b[0];
    float dy = a[1] - b[1];
    const float radiusA = a[2];
    const float radiusB = b[2];
    const float radiusSum = radiusA + radiusB;
    const float dSQ = dx * dx + dy * dy;
    if (radiusA <= 0 || radiusB <= 0 || dSQ >= radiusSum * radiusSum) return;

    const bool fixedA = a[4] != 0;
    const bool fixedB = b[4] != 0;
    const float d = __builtin_sqrt(dSQ);
    if (d == 0) {
        a[5] += randomFloat() - 0.5f;
        a[6] += randomFloat() - 0.5f;
        return;
    }

    const float normX = dx / d;
    const float normY = dy / d;
    if (!fixedA && !fixedB) {
        float nw1;
        float nw2;
        if (radiusA > radiusB) {
            nw1 = a[3] * (radiusA / radiusB);
            nw2 = b[3];
        } else {
            nw1 = a[3];
            nw2 = b[3] * (radiusB / radiusA);
        }
        const float weightSum = nw1 + nw2;
        if (weightSum <= 0) return;
        const float ad1 = nw2 / weightSum;
        const float ad2 = nw1 / weightSum;
        const float rm1 = radiusA / radiusSum;
        const float rm2 = radiusB / radiusSum;
        const float overlap = d - radiusSum;
        a[0] += -ad1 * rm1 * overlap * normX;
        a[1] += -ad1 * rm1 * overlap * normY;
        b[0] += ad2 * rm2 * overlap * normX;
        b[1] += ad2 * rm2 * overlap * normY;
    } else if (!fixedA && fixedB) {
        const float correction = radiusSum / d;
        a[0] -= (b[0] - a[0]) * correction;
        a[1] -= (b[1] - a[1]) * correction;
    } else if (!fixedB && fixedA) {
        const float correction = radiusSum / d;
        b[0] -= (a[0] - b[0]) * correction;
        b[1] -= (a[1] - b[1]) * correction;
    }
}

WASM_EXPORT
void collideBallForObject(float* balls, int count, int index){
    if (index < 0 || index >= count) return;
    float* current = balls + index * BALL_STRIDE;
    for (int j = 0; j < count; ++j) {
        if (index != j){
            collideBalls(current, balls + j * BALL_STRIDE);
        }
    }
}

WASM_EXPORT
void collideAllBalls(float* balls, int count){
    for (int i = 0; i < count; ++i) {
        collideBallForObject(balls, count, i);
    }
}