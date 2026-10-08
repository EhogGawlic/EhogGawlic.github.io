clang++ --target=wasm32 \
      -O3 \
      -mbulk-memory \
      -nostdlib \
      -Wl,--no-entry \
      -Wl,--export-all \
      -Wl,--export-memory \
      -Wl,--export=__heap_base \
      -Wl,--export=collideAllBalls \
      -Wl,--export=collideBallForObject \
      -Wl,--export=collideAllBallsGrid \
      -Wl,--export=gridScratchInts \
      -o main.wasm \
      main.cpp