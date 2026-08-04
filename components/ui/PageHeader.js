export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="study-page-header">
      <div>
        {eyebrow && <span className="study-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="study-page-actions">{actions}</div>}
      {children}
    </header>
  );
}
