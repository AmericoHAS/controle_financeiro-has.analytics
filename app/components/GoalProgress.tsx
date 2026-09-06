"use client";
export default function GoalProgress({ percent, name }: { percent: number; name: string }) {
  const value = Math.max(0,Math.min(100,percent));
  return <div className={`goal-journey ${value >= 100 ? "complete" : ""}`}><div className="goal-journey-label"><span>{value >= 100 ? "🎉 Você chegou lá!" : value >= 50 ? "🌱 Cada aporte aproxima você" : "✨ Uma conquista de cada vez"}</span><strong>{Math.round(value)}%</strong></div><div className="goal-track" role="progressbar" aria-label={`Progresso de ${name}`} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><div className="goal-fill" style={{ width: `${value}%` }} /><span className="goal-traveler" style={{ left: `${Math.min(95,Math.max(5,value))}%` }}>{value >= 100 ? "🏆" : "🌱"}</span></div><div className="goal-milestones"><span>Começo</span><span>Meio caminho</span><span>Conquista</span></div></div>;
}
