clang++ --target=wasm32 \
      -O3 \
      -nostdlib \
      -Wl,--no-entry \
      -Wl,--export-all \
      -Wl,--export-memory \
      -Wl,--export=__heap_base \
      -Wl,--export=collideAllBalls \
      -Wl,--export=collideBallForObject \
      -o main.wasm \
      main.cpp
