import { Fragment, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Position } from '../../../game/types';
import { JellyHandle } from '../../jelly/types';
import { SkinProps } from '../types';
import { exitDurationMs, LineJelly, POP_STAGGER_MS, SLURP_STAGGER_MS } from './LineJelly';

const isAnchor = (offset: Position) => offset.row === 0 && offset.col === 0;
const reach = (offset: Position) => Math.abs(offset.row) + Math.abs(offset.col);
const ANCHOR: Position = { row: 0, col: 0 };

/**
 * Get in line: the jelly as a conga line of copies in the owner's color. They pop out of the
 * anchor one after another as it forms, follow each other a beat apart as it moves, and slurp back
 * into the anchor, furthest first, when it runs out.
 */
export function GetInLineSkin({ entity, cellSize, jellyRef, phase, onExitDone }: SkinProps) {
  // The engine shrinks the footprint back to one cell the moment the power-up runs out, so keep the
  // last line seen to slurp back in.
  const [line, setLine] = useState(entity.footprint);
  if (entity.footprint.length > 1 && entity.footprint !== line) setLine(entity.footprint);

  // Nearest the anchor first: the order they pop out in.
  const copies = line.filter((offset) => !isAnchor(offset)).sort((a, b) => reach(a) - reach(b));

  // Moves and paints play on every jelly in the line.
  const handles = useRef(new Map<string, JellyHandle | null>());
  useImperativeHandle(
    jellyRef,
    () => ({
      playMove: (direction) => handles.current.forEach((handle) => handle?.playMove(direction)),
      playPaint: () => handles.current.forEach((handle) => handle?.playPaint()),
    }),
    []
  );

  useEffect(() => {
    if (phase !== 'expiring') return;
    const timer = setTimeout(onExitDone, exitDurationMs(copies.length));
    return () => clearTimeout(timer);
  }, [phase, onExitDone, copies.length]);

  const { position } = entity;
  const jellyFor = (offset: Position, index: number) => {
    const key = `${offset.row},${offset.col}`;
    return (
      <LineJelly
        key={key}
        color={entity.color}
        cellSize={cellSize}
        cell={{ row: position.row + offset.row, col: position.col + offset.col }}
        anchor={position}
        offset={offset}
        line={line}
        copies={copies.length}
        popDelayMs={index * POP_STAGGER_MS}
        slurpDelayMs={(copies.length - 1 - index) * SLURP_STAGGER_MS}
        phase={phase}
        jellyRef={(handle) => {
          handles.current.set(key, handle);
        }}
      />
    );
  };

  // The anchor goes last so the copies slurp in behind it.
  return (
    <Fragment>
      {copies.map(jellyFor)}
      {jellyFor(line.find(isAnchor) ?? ANCHOR, 0)}
    </Fragment>
  );
}
