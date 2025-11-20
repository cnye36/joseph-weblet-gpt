# Simulation Engine Specification

This document provides a complete specification for recreating the simulation engine functionality in your application. It describes all available models, their parameters, equations, and expected outputs.

## Overview

The simulation engine is a mathematical modeling system that solves differential equations and stochastic processes. It supports multiple domains (epidemiology, physics, finance) with various model types. All models use numerical integration methods to generate time-series data.

## Core Architecture

### Input Structure

All simulations accept the following input structure:

```json
{
  "domain": "epidemiology" | "physics" | "finance" | "custom",
  "model_type": "SIR" | "LotkaVolterra" | "Logistic" | "Projectile" | "MonteCarlo",
  "parameters": {
    // Model-specific parameters (all float values)
  },
  "initial_conditions": {
    // Initial state variable values (all float values)
  },
  "time_span": {
    "start": float,      // Start time
    "end": float,        // End time
    "steps": int,        // Number of data points (>= 2, default: 400)
    "preview_mode": bool // If true, limit steps to 100 (default: false)
  },
  "method": "RK45" | "RK23" | "DOP853",  // ODE solver method (default: "RK45")
  "return_data": bool,   // Return actual data points (default: true)
  "sensitivity": {       // Optional: parameter perturbations for sensitivity analysis
    "param_name": float  // +/- perturbation value
  },
  "tags": [string]       // Optional: metadata tags
}
```

### Output Structure

All simulations return:

```json
{
  "status": "success" | "error",
  "message": string,
  "summary": string,              // Human-readable summary
  "metrics": {                    // Model-specific calculated metrics
    "metric_name": float
  },
  "columns": [string],             // Column names: ["t", "state_var1", "state_var2", ...]
  "data": [                        // Time series data (if return_data=true)
    {
      "t": float,
      "state_var1": float,
      "state_var2": float,
      ...
    },
    ...
  ]
}
```

### Solver Methods

Three ODE solver methods are available (Monte Carlo uses its own method):

- **RK45** (default): 4th/5th order Runge-Kutta with adaptive step size. Best balance of speed and accuracy.
- **RK23**: 2nd/3rd order Runge-Kutta. Faster but less accurate.
- **DOP853**: 8th order Dormand-Prince. Very accurate but slower.

All solvers use:
- Relative tolerance: `1e-6`
- Absolute tolerance: `1e-9`
- Time evaluation points: evenly spaced from `start` to `end` with `steps` points

---

## Available Models

### 1. SIR Model (Epidemiology)

**Domain:** `epidemiology`  
**Model Type:** `SIR`  
**Description:** Susceptible-Infected-Recovered epidemic model for disease spread simulation.

#### Parameters

- `beta` (float): Infection rate (rate at which susceptible individuals become infected)
- `gamma` (float): Recovery rate (rate at which infected individuals recover)

#### Initial Conditions

- `S` (float): Initial susceptible population (fraction, typically 0.0-1.0)
- `I` (float): Initial infected population (fraction, typically 0.0-1.0)
- `R` (float): Initial recovered population (fraction, typically 0.0-1.0)

**Constraint:** S + I + R should sum to approximately 1.0 (representing 100% of population)

#### Differential Equations

```
dS/dt = -beta * S * I
dI/dt = beta * S * I - gamma * I
dR/dt = gamma * I
```

#### Output Columns

`["t", "S", "I", "R"]`

#### Metrics Returned

- `I_peak` (float): Maximum infected population fraction
- `t_peak` (float): Time at which peak infection occurs
- `summary` (string): Human-readable summary

#### Example Input

```json
{
  "domain": "epidemiology",
  "model_type": "SIR",
  "parameters": {
    "beta": 0.3,
    "gamma": 0.1
  },
  "initial_conditions": {
    "S": 0.99,
    "I": 0.01,
    "R": 0.0
  },
  "time_span": {
    "start": 0,
    "end": 160,
    "steps": 400
  }
}
```

---

### 2. Lotka-Volterra Model (Epidemiology/Physics)

**Domain:** `epidemiology` (can also be physics)  
**Model Type:** `LotkaVolterra`  
**Description:** Predator-prey population dynamics model.

#### Parameters

- `alpha` (float): Prey birth rate (natural growth rate of prey)
- `beta` (float): Predation rate (rate at which predators consume prey)
- `delta` (float): Predator growth rate (conversion efficiency of prey to predator growth)
- `gamma` (float): Predator death rate (natural death rate of predators)

#### Initial Conditions

- `x` (float): Initial prey population
- `y` (float): Initial predator population

#### Differential Equations

```
dx/dt = alpha * x - beta * x * y
dy/dt = delta * x * y - gamma * y
```

#### Output Columns

`["t", "x", "y"]`

#### Metrics Returned

- `x_max` (float): Maximum prey population
- `x_min` (float): Minimum prey population
- `x_mean` (float): Average prey population
- `y_max` (float): Maximum predator population
- `y_min` (float): Minimum predator population
- `y_mean` (float): Average predator population
- `summary` (string): Human-readable summary

#### Example Input

```json
{
  "domain": "epidemiology",
  "model_type": "LotkaVolterra",
  "parameters": {
    "alpha": 1.1,
    "beta": 0.4,
    "delta": 0.1,
    "gamma": 0.4
  },
  "initial_conditions": {
    "x": 40,
    "y": 9
  },
  "time_span": {
    "start": 0,
    "end": 100,
    "steps": 400
  }
}
```

---

### 3. Logistic Growth Model (Epidemiology/Physics)

**Domain:** `epidemiology` (can also be physics)  
**Model Type:** `Logistic`  
**Description:** Logistic population growth with carrying capacity.

#### Parameters

- `r` (float): Growth rate (intrinsic rate of increase)
- `K` (float): Carrying capacity (maximum sustainable population)

#### Initial Conditions

- `P` (float): Initial population

#### Differential Equation

```
dP/dt = r * P * (1 - P/K)
```

#### Output Columns

`["t", "P"]`

#### Metrics Returned

- `P_initial` (float): Initial population value
- `P_final` (float): Final population value
- `P_max` (float): Maximum population reached
- `K` (float): Carrying capacity (from parameters)
- `t_halfway` (float): Time to reach 50% of carrying capacity
- `t_ninety` (float): Time to reach 90% of carrying capacity
- `summary` (string): Human-readable summary

#### Example Input

```json
{
  "domain": "epidemiology",
  "model_type": "Logistic",
  "parameters": {
    "r": 0.5,
    "K": 100.0
  },
  "initial_conditions": {
    "P": 10.0
  },
  "time_span": {
    "start": 0,
    "end": 50,
    "steps": 200
  }
}
```

---

### 4. Projectile Motion Model (Physics)

**Domain:** `physics`  
**Model Type:** `Projectile`  
**Description:** Projectile motion simulation with gravity (no air resistance).

#### Parameters

- `g` (float): Gravitational acceleration (default: 9.81 m/s²)
- `v0` (float): Initial velocity magnitude (m/s)
- `angle` (float): Launch angle in degrees from horizontal (0° = horizontal, 90° = vertical)

#### Initial Conditions

- `x` (float): Initial horizontal position (m)
- `y` (float): Initial vertical position (m)
- `vx` (float, optional): Initial horizontal velocity (m/s). If 0 or not provided, calculated from `v0` and `angle`
- `vy` (float, optional): Initial vertical velocity (m/s). If 0 or not provided, calculated from `v0` and `angle`

**Note:** If `vx` and `vy` are both 0 or not provided, they are calculated as:
- `vx = v0 * cos(angle_radians)`
- `vy = v0 * sin(angle_radians)`

#### Differential Equations

```
dx/dt = vx
dy/dt = vy
dvx/dt = 0        (no horizontal acceleration)
dvy/dt = -g       (gravity)
```

#### Output Columns

`["t", "x", "y", "vx", "vy"]`

#### Metrics Returned

- `max_height` (float): Maximum vertical height reached (m)
- `t_max_height` (float): Time at which maximum height is reached (s)
- `range` (float): Horizontal distance when projectile returns to initial height (m)
- `t_landing` (float): Time when projectile lands (returns to initial height) (s)
- `v_initial` (float): Initial velocity magnitude (from parameters)
- `v_final` (float): Velocity magnitude at landing (m/s)
- `v_max` (float): Maximum velocity magnitude during flight (m/s)
- `angle_deg` (float): Launch angle in degrees (from parameters)
- `summary` (string): Human-readable summary

#### Example Input

```json
{
  "domain": "physics",
  "model_type": "Projectile",
  "parameters": {
    "g": 9.81,
    "v0": 20.0,
    "angle": 45.0
  },
  "initial_conditions": {
    "x": 0.0,
    "y": 0.0,
    "vx": 0.0,
    "vy": 0.0
  },
  "time_span": {
    "start": 0,
    "end": 5,
    "steps": 100
  }
}
```

---

### 5. Monte Carlo Model (Finance)

**Domain:** `finance`  
**Model Type:** `MonteCarlo`  
**Description:** Geometric Brownian motion for financial asset price modeling. Uses stochastic simulation with multiple paths.

#### Parameters

- `mu` (float): Drift rate (expected return, annualized, e.g., 0.1 = 10%)
- `sigma` (float): Volatility (standard deviation, annualized, e.g., 0.2 = 20%)
- `n_paths` (int, treated as float): Number of Monte Carlo simulation paths (default: 100)
- `seed` (float, optional): Random seed for reproducibility (if not provided, uses random seed)

#### Initial Conditions

- `S` (float): Initial asset price/value

#### Stochastic Differential Equation

```
dS = mu * S * dt + sigma * S * dW
```

Where `dW` is a Wiener process (random walk with normal distribution).

**Implementation:** Uses Euler-Maruyama discretization:
```
S(t+dt) = S(t) * exp((mu - 0.5*sigma²)*dt + sigma*dW)
```

Where `dW ~ N(0, sqrt(dt))` (normally distributed random increment).

#### Output Columns

`["t", "S"]` (where S is the mean path across all Monte Carlo paths)

#### Metrics Returned

- `S_initial` (float): Initial asset price
- `S_final_mean` (float): Mean final price across all paths
- `S_final_median` (float): Median final price across all paths
- `S_final_std` (float): Standard deviation of final prices
- `S_final_min` (float): Minimum final price across all paths
- `S_final_max` (float): Maximum final price across all paths
- `expected_return_pct` (float): Expected return percentage: `(S_final_mean - S_initial) / S_initial * 100`
- `max_return_pct` (float): Maximum return percentage across all paths
- `min_return_pct` (float): Minimum return percentage across all paths
- `prob_profit_pct` (float): Probability of profit (percentage of paths where final price > initial price)
- `n_paths` (int): Number of paths simulated
- `mu` (float): Drift rate (from parameters)
- `sigma` (float): Volatility (from parameters)
- `percentiles` (object): Contains arrays for p5, p25, p75, p95 percentiles at each time point
  - `p5`: 5th percentile path
  - `p25`: 25th percentile path
  - `p75`: 75th percentile path
  - `p95`: 95th percentile path
- `summary` (string): Human-readable summary

**Note:** The `method` parameter is ignored for Monte Carlo simulations (it uses its own stochastic method).

#### Example Input

```json
{
  "domain": "finance",
  "model_type": "MonteCarlo",
  "parameters": {
    "mu": 0.1,
    "sigma": 0.2,
    "n_paths": 1000,
    "seed": 42
  },
  "initial_conditions": {
    "S": 100.0
  },
  "time_span": {
    "start": 0,
    "end": 1.0,
    "steps": 252
  }
}
```

---

## Implementation Details

### Numerical Integration

All ODE models (SIR, Lotka-Volterra, Logistic, Projectile) use `scipy.integrate.solve_ivp` with:
- Method: One of RK45, RK23, or DOP853
- Relative tolerance: `1e-6`
- Absolute tolerance: `1e-9`
- Time evaluation points: `np.linspace(start, end, steps)`

### Data Format

The output data is structured as an array of objects, where each object represents a time point:

```json
[
  {"t": 0.0, "S": 0.99, "I": 0.01, "R": 0.0},
  {"t": 0.4, "S": 0.989, "I": 0.011, "R": 0.0},
  ...
]
```

The `columns` array indicates the order: `["t", "S", "I", "R"]` means each data point has keys `t`, `S`, `I`, `R`.

### Error Handling

The system should handle:
1. **Invalid model type**: Return error if domain/model_type combination is not supported
2. **Missing parameters**: Validate all required parameters are present
3. **Invalid initial conditions**: Validate constraints (e.g., S+I+R ≈ 1.0 for SIR)
4. **Solver failures**: Catch and report numerical integration errors
5. **Invalid time span**: Ensure `end > start` and `steps >= 2`

### Performance Considerations

- **Preview mode**: When `preview_mode: true`, limit steps to 100 for faster rendering
- **Return data**: Set `return_data: false` to skip data serialization if only metrics are needed
- **Steps**: More steps = higher accuracy but slower computation
  - 100-400 steps: Fast, good for previews
  - 600-1000 steps: Standard quality
  - 1000+ steps: High quality, slower

### Monte Carlo Specific Notes

- Monte Carlo simulations are computationally intensive. Consider:
  - `n_paths`: More paths = better statistics but slower (100-1000 is typical)
  - `steps`: More steps = finer time resolution (252 = daily for 1 year)
  - Random seed: Use for reproducibility in testing
  - Percentiles: Calculate 5th, 25th, 75th, 95th percentiles for confidence bands

---

## Model Registry

The system maintains a registry mapping `(domain, model_type)` tuples to solver functions:

```python
SOLVERS = {
    ("epidemiology", "SIR"): simulate_sir,
    ("epidemiology", "LotkaVolterra"): simulate_lotka_volterra,
    ("epidemiology", "Logistic"): simulate_logistic,
    ("physics", "Projectile"): simulate_projectile,
    ("finance", "MonteCarlo"): simulate_monte_carlo,
}
```

**Note:** Some models are registered under `epidemiology` domain but could logically belong to other domains. The domain is primarily for organization.

---

## Dependencies

To recreate this system, you'll need:

### Python
- `numpy`: Numerical arrays and operations
- `scipy`: ODE solvers (`scipy.integrate.solve_ivp`)
- `pydantic` (optional): Input validation
- `matplotlib` (optional): Plotting if you want to generate visualizations

### JavaScript/TypeScript
- A numerical ODE solver library (e.g., `odex`, `ode-solvers`, or implement RK45)
- For Monte Carlo: Random number generation (e.g., `seedrandom` for seeded randomness)

### Alternative Approaches
- Use WebAssembly to run Python/NumPy code in the browser
- Use a backend API that calls Python libraries
- Implement solvers natively in your language of choice

---

## Example Complete Request/Response

### Request

```json
{
  "domain": "epidemiology",
  "model_type": "SIR",
  "parameters": {
    "beta": 0.3,
    "gamma": 0.1
  },
  "initial_conditions": {
    "S": 0.99,
    "I": 0.01,
    "R": 0.0
  },
  "time_span": {
    "start": 0,
    "end": 160,
    "steps": 400,
    "preview_mode": false
  },
  "method": "RK45",
  "return_data": true
}
```

### Response

```json
{
  "status": "success",
  "message": "Simulation completed",
  "summary": "Peak infection 0.3743 at t ≈ 33.89",
  "metrics": {
    "I_peak": 0.3743,
    "t_peak": 33.89
  },
  "columns": ["t", "S", "I", "R"],
  "data": [
    {"t": 0.0, "S": 0.99, "I": 0.01, "R": 0.0},
    {"t": 0.4, "S": 0.9896, "I": 0.0104, "R": 0.0},
    ...
  ]
}
```

---

## Summary

This simulation engine provides:
- **5 distinct models** across 3 domains
- **Flexible time spans** with configurable resolution
- **Multiple solver methods** for different accuracy/speed tradeoffs
- **Rich metrics** calculated for each model type
- **Time-series data** in JSON format for easy visualization
- **Preview mode** for fast initial rendering
- **Monte Carlo support** with statistical analysis

All models follow a consistent input/output interface, making it easy to add new models or extend existing ones.

