/* ============================================
   CHARTS MODULE - Pasukan Katak Orange
   Chart.js visualizations with 3D-styled effects
   ============================================ */

const Charts = {
    greenPalette: [
        'rgba(76, 175, 80, 0.8)',
        'rgba(102, 187, 106, 0.8)',
        'rgba(129, 199, 132, 0.8)',
        'rgba(56, 142, 60, 0.8)',
        'rgba(46, 125, 50, 0.8)'
    ],
    orangePalette: [
        'rgba(255, 152, 0, 0.8)',
        'rgba(255, 167, 38, 0.8)',
        'rgba(255, 183, 77, 0.8)',
        'rgba(251, 140, 0, 0.8)',
        'rgba(245, 124, 0, 0.8)'
    ],
    mixedPalette: [
        'rgba(76, 175, 80, 0.8)',
        'rgba(255, 152, 0, 0.8)',
        'rgba(156, 39, 176, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(255, 87, 34, 0.7)',
        'rgba(0, 188, 212, 0.7)',
        'rgba(139, 195, 74, 0.7)',
        'rgba(255, 193, 7, 0.7)'
    ],

    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255,255,255,0.7)',
                    font: { family: 'Poppins', size: 12 },
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(10, 26, 10, 0.95)',
                titleColor: '#66BB6A',
                bodyColor: '#ffffff',
                borderColor: 'rgba(76, 175, 80, 0.3)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: 'Poppins', weight: '600' },
                bodyFont: { family: 'Poppins' }
            }
        }
    },

    // Doughnut / Pie chart for category breakdown
    createCategoryChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const labels = Object.keys(data);
        const values = Object.values(data);

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(156, 39, 176, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(156, 39, 176, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 15,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                ...this.defaultOptions,
                cutout: '60%',
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    },

    // Bar chart for monthly data
    createMonthlyChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const labels = Object.keys(data);
        const values = Object.values(data);

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Berat Sampah (kg)',
                    data: values,
                    backgroundColor: labels.map((_, i) =>
                        i % 2 === 0 ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 152, 0, 0.6)'
                    ),
                    borderColor: labels.map((_, i) =>
                        i % 2 === 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(255, 152, 0, 1)'
                    ),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Poppins', size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: { family: 'Poppins', size: 11 },
                            callback: v => v + ' kg'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    },

    // Line chart for trends over time
    createTrendChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const labels = Object.keys(data);
        const values = Object.values(data);

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Sampah (kg)',
                    data: values,
                    borderColor: 'rgba(76, 175, 80, 1)',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(255, 152, 0, 1)',
                    pointBorderColor: 'rgba(255, 152, 0, 1)',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Poppins', size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: { family: 'Poppins', size: 11 },
                            callback: v => v + ' kg'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    },

    // Bar chart for item breakdown
    createItemChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Sort by value, take top items
        const sorted = Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        const labels = sorted.map(e => e[0].replace(/\s*\(.*\)\s*/g, ''));
        const values = sorted.map(e => e[1]);

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Berat (kg)',
                    data: values,
                    backgroundColor: this.mixedPalette.slice(0, values.length),
                    borderColor: this.mixedPalette.slice(0, values.length).map(c => c.replace('0.7', '1').replace('0.8', '1')),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.defaultOptions,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: { family: 'Poppins', size: 11 },
                            callback: v => v + ' kg'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: 'rgba(255,255,255,0.6)', font: { family: 'Poppins', size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    },

    // Polar area chart
    createPolarChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const yearLabels = Object.keys(data);
        const yearValues = Object.values(data);

        return new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: yearLabels,
                datasets: [{
                    data: yearValues,
                    backgroundColor: this.mixedPalette.slice(0, yearValues.length)
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    r: {
                        ticks: { display: false },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    }
};
