import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export function WeekChart({ labels, minutes, todayIndex }: { labels: string[]; minutes: number[]; todayIndex: number }) {
  return (
    <div className="h-56">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Minutos de foco',
              data: minutes,
              backgroundColor: minutes.map((_, i) => (i === todayIndex ? '#d9472b' : '#d8cdb9')),
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
              backgroundColor: '#1d1b18',
              padding: 10,
              displayColors: false,
              callbacks: { label: (ctx) => `${ctx.parsed.y} min de foco` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#6f685d', font: { family: 'Manrope', weight: 600 } },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 100,
              border: { display: false },
              grid: { color: '#e9e2d4' },
              ticks: { color: '#6f685d', font: { family: 'JetBrains Mono', size: 11 }, stepSize: 25 },
            },
          },
        }}
      />
    </div>
  )
}