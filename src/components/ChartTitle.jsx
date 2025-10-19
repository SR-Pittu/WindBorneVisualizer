export default function ChartTitle({ title, detail, className = "" }) {
  return (
    <div className={`chart-title ${className}`}>
      <h2 className="chart-title__text">{title}</h2>
      <span className="chart-title__info" tabIndex={0} aria-label={`About: ${title}`}>
        ⓘ
        <span className="chart-title__tooltip" role="tooltip">
          {detail}
        </span>
      </span>
    </div>
  );
}
