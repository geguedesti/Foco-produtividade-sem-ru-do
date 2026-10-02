import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { useEffect, useState } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export function WeekChart({ labels, minutes, todayIndex }: { labels: string[]; minutes: number[]; todayIndex: number }) {
  const [colors, setColors] = useState({ tomato: '#d9472b', line: '#e9e2d4', muted: '#6f685d', ink: '#1d1b18' })
  useEffect(() => {
    const readColors = () => {
      const css = getComputedStyle(document.documentElement)
      setColors({
        tomato: css.getPropertyValue('--color-tomato').trim() || '#d9472b',
        line: css.getPropertyValue('--color-line').trim() || '#e9e2d4',
        muted: css.getPropertyValue('--color-muted').trim() || '#6f685d',
        ink: css.getPropertyValue('--color-ink').trim() || '#1d1b18',
      })
    }
    readColors()
    const observer = new MutationObserver(readColors)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return (
    <div className="h-56">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Minutos de foco',
              data: minutes,
              backgroundColor: minutes.map((_, i) => (i === todayIndex ? colors.tomato : colors.line)),
              borderRadius: 8,
              borderSkipped: false,
              maxBarThickness: 36,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: colors.ink,
              padding: 10,
              displayColors: false,
              callbacks: { label: (ctx) => `${ctx.parsed.y} min de foco` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: colors.muted, font: { family: 'Manrope', weight: 600 } },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 100,
              border: { display: false },
              grid: { color: colors.line },
              ticks: { color: colors.muted, font: { family: 'JetBrains Mono', size: 11 }, stepSize: 25 },
            },
          },
        }}
      />
    </div>
  )
}
