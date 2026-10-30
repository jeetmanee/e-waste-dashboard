import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import { ArrowUpRight, Info } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md' }) {
  return <button className={`button button-${variant} button-${size} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ children, href, variant = 'quiet', className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <a href={href} className={`button button-${variant} button-md ${className}`} {...props}>{children}</a>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header">
    <div className="page-header-copy">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </div>
    {action && <div className="page-header-action">{action}</div>}
  </div>;
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <div className="panel-heading">{title && <h2>{title}</h2>}{action}</div>}
    {children}
  </section>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-icon">{icon}</div>}<h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function StatusTag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'amber' | 'green' | 'red' }) {
  return <span className={`status-tag status-${tone}`}>{children}</span>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  return <div className={`notice notice-${tone}`}><Info size={16}/><div>{children}</div></div>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="text-link" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={13}/></a>;
}

export function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="meta-row"><span>{label}</span><strong>{value}</strong></div>;
}
