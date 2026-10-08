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

// ---------------------------------------------------------------------------
// Uniform grid broad phase
// ---------------------------------------------------------------------------
static constexpr int GRID_MAX  = 128;                     // max cells per axis (before +1)
static constexpr int GRID_DIM  = GRID_MAX + 1;
static constexpr int MAX_CELLS = GRID_DIM * GRID_DIM;

// Number of ints JS must reserve for the scratch area.
WASM_EXPORT
int gridScratchInts(int count){
    return 2 * count + MAX_CELLS + 1;   // cellOf[count] + order[count] + cellStart[MAX_CELLS + 1]
}

//please dont get mad at me for using ai
WASM_EXPORT
void collideAllBallsGrid(float* balls, int count, int* scratch){
    int* cellOf    = scratch;                 // cell index per ball, -1 = skipped
    int* order     = scratch + count;         // ball indices sorted by cell
    int* cellStart = scratch + 2 * count;     // MAX_CELLS + 1 entries

    // 1. bounds + largest radius (ignore balls with radius <= 0, collideBalls ignores them too)
    float minX = 1e30f, minY = 1e30f, maxX = -1e30f, maxY = -1e30f, maxR = 0.0f;
    int active = 0;
    for (int i = 0; i < count; ++i) {
        const float* b = balls + i * BALL_STRIDE;
        if (b[2] <= 0) continue;
        ++active;
        if (b[0] < minX) minX = b[0];
        if (b[0] > maxX) maxX = b[0];
        if (b[1] < minY) minY = b[1];
        if (b[1] > maxY) maxY = b[1];
        if (b[2] > maxR) maxR = b[2];
    }
    if (active < 2) return;

    // 2. cell size: >= 2*maxR so any overlapping pair is within neighbouring cells,
    //    and large enough that we never exceed GRID_MAX cells per axis
    const float extentX = maxX - minX;
    const float extentY = maxY - minY;
    float cell = 2.0f * maxR;
    const float minCell = (extentX > extentY ? extentX : extentY) / (float)GRID_MAX;
    if (minCell > cell) cell = minCell;
    const float inv = 1.0f / cell;
    int gw = (int)(extentX * inv) + 1;
    int gh = (int)(extentY * inv) + 1;
    if (gw > GRID_DIM) gw = GRID_DIM;
    if (gh > GRID_DIM) gh = GRID_DIM;
    const int cells = gw * gh;

    // 3. counting sort of balls into cells
    for (int c = 0; c <= cells; ++c) cellStart[c] = 0;
    for (int i = 0; i < count; ++i) {
        const float* b = balls + i * BALL_STRIDE;
        if (b[2] <= 0) { cellOf[i] = -1; continue; }
        int cx = (int)((b[0] - minX) * inv);
        int cy = (int)((b[1] - minY) * inv);
        if (cx >= gw) cx = gw - 1;
        if (cy >= gh) cy = gh - 1;
        const int c = cy * gw + cx;
        cellOf[i] = c;
        ++cellStart[c + 1];
    }
    for (int c = 0; c < cells; ++c) cellStart[c + 1] += cellStart[c];
    // cellStart[c] is now the first slot of cell c; use a moving write cursor stored in-place
    // (cursor trick: fill using cellStart[c]++ then shift back afterwards)
    for (int i = 0; i < count; ++i) {
        const int c = cellOf[i];
        if (c >= 0) order[cellStart[c]++] = i;
    }
    // after filling, cellStart[c] == end of cell c == start of cell c+1; shift right by one
    for (int c = cells; c > 0; --c) cellStart[c] = cellStart[c - 1];
    cellStart[0] = 0;

    // 4. narrow phase: same pairwise rule as collideAllBalls, but only against the 3x3 neighbourhood
    for (int i = 0; i < count; ++i) {
        const int ci = cellOf[i];
        if (ci < 0) continue;
        float* a = balls + i * BALL_STRIDE;
        const int cx = ci % gw;
        const int cy = ci / gw;
        const int y0 = cy > 0 ? cy - 1 : 0;
        const int y1 = cy < gh - 1 ? cy + 1 : gh - 1;
        const int x0 = cx > 0 ? cx - 1 : 0;
        const int x1 = cx < gw - 1 ? cx + 1 : gw - 1;
        for (int ny = y0; ny <= y1; ++ny) {
            for (int nx = x0; nx <= x1; ++nx) {
                const int c = ny * gw + nx;
                for (int k = cellStart[c]; k < cellStart[c + 1]; ++k) {
                    const int j = order[k];
                    if (j != i) collideBalls(a, balls + j * BALL_STRIDE);
                }
            }
        }
    }
}