import plotly.graph_objects as go
import numpy as np

# Données : population mondiale (estimations simplifiées)
annees = list(range(1900, 2031, 10))
population = [1.65, 1.75, 1.86, 2.07, 2.30, 2.52, 3.03, 3.70, 4.45,
              5.32, 6.15, 6.96, 7.84, 8.55]

fig = go.Figure()
fig.add_trace(go.Scatter(
    x=annees,
    y=population,
    mode="lines+markers",
    name="Population (milliards)",
    line=dict(color="#2563eb", width=3),
    marker=dict(size=8),
    hovertemplate="<b>%{x}</b><br>%{y:.2f} milliards<extra></extra>",
))

fig.update_layout(
    title="Population mondiale 1900–2030",
    xaxis_title="Année",
    yaxis_title="Milliards d'habitants",
    template="plotly_white",
    hovermode="x unified",
)

fig.show()
