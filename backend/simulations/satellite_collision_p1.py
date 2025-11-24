# backend/simulations/satellite_collision_p1.py
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp
from matplotlib.animation import FuncAnimation, PillowWriter
import os

def run_simulation(output_file, duration=6000, save_format="gif"):
    """
    Run a single satellite orbit simulation and save to output_file (absolute path).
    - output_file: absolute path to write (e.g. '/.../frontend/static/results/<name>.gif')
    - duration: total simulated seconds
    - save_format: 'gif' or 'mp4'
    Returns: output_file (string)
    """
    G = 6.67430e-11
    M_earth = 5.972e24
    R_earth = 6.378e6
    altitude = 500e3

    r0 = R_earth + altitude
    v0 = np.sqrt(G * M_earth / r0)
    initial_state = [r0, 0, 0, v0]

    t_eval = np.linspace(0, duration, num=500)

    def orbital_dynamics(t, state):
        x, y, vx, vy = state
        r = np.sqrt(x**2 + y**2)
        ax = -G * M_earth * x / r**3
        ay = -G * M_earth * y / r**3
        return [vx, vy, ax, ay]

    solution = solve_ivp(orbital_dynamics, [0, duration], initial_state, t_eval=t_eval)
    x_vals, y_vals = solution.y[0], solution.y[1]

    fig, ax = plt.subplots(figsize=(6,6))
    ax.set_xlim(-r0 / 1e6, r0 / 1e6)
    ax.set_ylim(-r0 / 1e6, r0 / 1e6)

    earth = plt.Circle((0, 0), R_earth / 1e6, color='blue', alpha=0.5)
    ax.add_patch(earth)

    ax.plot(x_vals / 1e6, y_vals / 1e6, 'gray', linestyle='--', alpha=0.5, label="Orbit Path")
    satellite, = ax.plot([], [], 'ro', markersize=5, label="Satellite")

    ax.set_xlabel("X Position (km)")
    ax.set_ylabel("Y Position (km)")
    ax.set_title("Satellite Orbit Simulation")
    ax.legend()
    ax.set_aspect('equal')

    def update(frame):
        satellite.set_data([x_vals[frame] / 1e6], [y_vals[frame] / 1e6])
        return satellite,

    ani = FuncAnimation(fig, update, frames=len(t_eval), interval=20, blit=True)

    out_dir = os.path.dirname(output_file)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if save_format == "gif":
        writer = PillowWriter(fps=30)
        ani.save(output_file, writer=writer)
    elif save_format == "mp4":
        ani.save(output_file, writer="ffmpeg", fps=30)
    else:
        raise ValueError("save_format must be 'gif' or 'mp4'")

    plt.close(fig)
    return output_file

if __name__ == "__main__":
    fp = run_simulation(os.path.abspath("orbit_animation.gif"), duration=6000, save_format="gif")
    print("Saved:", fp)
