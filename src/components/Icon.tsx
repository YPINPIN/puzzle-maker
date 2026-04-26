import React from 'react';
import type { IconName } from './iconNames';

export type { IconName };

const SPRITE_PATH = `${import.meta.env.BASE_URL}icons.svg`;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number | string;
  title?: string;
  spin?: boolean;
  className?: string;
}

export const Icon = React.memo(function Icon({
  name,
  size = 20,
  title,
  spin = false,
  className = '',
  ...rest
}: IconProps) {
  const labelled = Boolean(title);
  const classes = [
    'inline-block shrink-0 align-[-2px]',
    spin ? 'animate-spin' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={classes}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      <use href={`${SPRITE_PATH}#${name}`} />
    </svg>
  );
});

export default Icon;
