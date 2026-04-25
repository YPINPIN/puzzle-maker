import React from 'react';

export const ICON_NAMES = [
  'brand-mark', 'brand-mark-dark', 'brand-mark-mono',
  'ic-back', 'ic-forward', 'ic-home',
  'ic-arrow-left', 'ic-arrow-right',
  'ic-close', 'ic-menu', 'ic-more',
  'ic-check', 'ic-plus', 'ic-minus',
  'ic-search', 'ic-settings',
  'ic-play', 'ic-pause', 'ic-stop', 'ic-restart', 'ic-shuffle',
  'ic-sparkle', 'ic-trophy', 'ic-medal', 'ic-target',
  'ic-timer', 'ic-hourglass',
  'ic-zoom-in', 'ic-zoom-out', 'ic-zoom-fit',
  'ic-eye', 'ic-eye-off', 'ic-lightbulb', 'ic-flag',
  'ic-upload', 'ic-download', 'ic-save',
  'ic-image', 'ic-folder', 'ic-file', 'ic-clipboard',
  'ic-trash', 'ic-edit', 'ic-copy',
  'ic-share', 'ic-link',
  'ic-info', 'ic-warning', 'ic-error', 'ic-success', 'ic-help',
  'ic-lock', 'ic-unlock',
  'ic-heart', 'ic-star', 'ic-bookmark',
  'ic-sun', 'ic-moon', 'ic-contrast',
  'ic-fullscreen', 'ic-fullscreen-exit',
  'ic-volume', 'ic-volume-off',
  'crest-easy', 'crest-normal', 'crest-hard', 'crest-expert',
  'ic-refresh', 'ic-undo', 'ic-redo',
  'ic-puzzle', 'ic-grid', 'ic-list', 'ic-drag',
  'ic-crop', 'ic-rotate', 'ic-spinner',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

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
