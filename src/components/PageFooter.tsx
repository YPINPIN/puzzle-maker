import { Icon } from './Icon';

export default function PageFooter() {
  return (
    <div className="flex flex-col items-center gap-1 pt-2 pb-1 text-xs text-paper-500">
      <p>© 2026 拼圖樂. All rights reserved.</p>
      <p className="inline-flex items-center gap-1.5">
        <span>僅供個人學習使用，非商業用途</span>
        <a
          href="https://github.com/YPINPIN"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-paper-700 transition-colors"
        >
          <Icon name="ic-github" size={14} />
          <span className="translate-y-px">YPINPIN</span>
        </a>
      </p>
    </div>
  );
}
