#3c
import matplotlib.pyplot as plt
import numpy as np
import datetime as dt
import math as m
from matplotlib.animation import FuncAnimation
from IPython.display import HTML

# Collision detection threshold in km
COLLISION_THRESHOLD = 10.0
collision_detected = False
#matplotlib.pyplot for plotting the orbits
#numpy for math operations and array handling
#datetime for handling TLE timestamps
#math for trigonometric and orbital calculations

mu = 398600.4418
r = 6781
D = 24 * 0.997269

def plot_tle(data):
    fig = plt.figure()
    ax = plt.axes(projection='3d', computed_zorder=False)

    # Plot Earth
    u, v = np.mgrid[0:2 * np.pi:20j, 0:np.pi:10j]
    ax.plot_wireframe(r * np.cos(u) * np.sin(v),
                     r * np.sin(u) * np.sin(v),
                     r * np.cos(v), color="b", alpha=0.5, lw=0.5, zorder=0)

    # Set plot labels and title
    ax.set_xlabel("X-axis (km)")
    ax.set_ylabel("Y-axis (km)")
    ax.set_zlabel("Z-axis (km)")
    ax.xaxis.set_tick_params(labelsize=7)
    ax.yaxis.set_tick_params(labelsize=7)
    ax.zaxis.set_tick_params(labelsize=7)
    ax.set_aspect('equal', adjustable='box')

    lines = []
    for sat_name, tle in data.items():
        line, = ax.plot([], [], [], label=sat_name)
        lines.append(line)

    # Text for collision alert
    collision_text = ax.text2D(0.05, 0.95, "", transform=ax.transAxes, fontsize=12, color='red', weight='bold')

    def init():
        for line in lines:
            line.set_data([], [])
            line.set_3d_properties([])
        collision_text.set_text("")
        return lines + [collision_text]

    def update(frame):
        global collision_detected
        positions = []
        for line, (sat_name, tle) in zip(lines, data.items()):
            # Handle both tuple and multi-line string TLE formats
            if isinstance(tle, str):
                tle_lines = tle.strip().splitlines()
                if len(tle_lines) == 2:
                    tle1, tle2 = tle_lines
                else:
                    print(f"Skipping {sat_name}: Invalid TLE format")
                    continue
            elif isinstance(tle, tuple) and len(tle) == 2:
                tle1, tle2 = tle
            else:
                print(f"Skipping {sat_name}: Invalid TLE format")
                continue


            if tle1[0] != "1":
                continue

            year_str = tle1[18:20]
            if int(year_str) > int(dt.date.today().year % 100):
                year_prefix = "19"
            else:
                year_prefix = "20"

            orb = {"t": dt.datetime.strptime(
                year_prefix + year_str + " " + tle1[20:23] + " " +
                str(int(24 * float(tle1[23:33]) // 1)) + " " +
                str(int(((24 * float(tle1[23:33]) % 1) * 60) // 1)) + " " +
                str(int((((24 * float(tle1[23:33]) % 1) * 60) % 1) // 1)),
                "%Y %j %H %M %S"
            )}

            orb.update({
                "name": tle2[2:7],
                "e": float("." + tle2[26:34]),
                "a": (mu / ((2 * m.pi * float(tle2[52:63]) / (D * 3600)) ** 2)) ** (1. / 3),
                "i": float(tle2[9:17]) * m.pi / 180,
                "RAAN": float(tle2[17:26]) * m.pi / 180,
                "omega": float(tle2[34:43]) * m.pi / 180
            })

            orb.update({"b": orb["a"] * m.sqrt(1 - orb["e"] ** 2),
                        "c": orb["a"] * orb["e"]})

            R = np.matmul(np.array([[m.cos(orb["RAAN"]), -m.sin(orb["RAAN"]), 0],
                                     [m.sin(orb["RAAN"]), m.cos(orb["RAAN"]), 0],
                                     [0, 0, 1]]),
                          (np.array([[1, 0, 0],
                                     [0, m.cos(orb["i"]), -m.sin(orb["i"])],
                                     [0, m.sin(orb["i"]), m.cos(orb["i"])]])))
            R = np.matmul(R, np.array([[m.cos(orb["omega"]), -m.sin(orb["omega"]), 0],
                                     [m.sin(orb["omega"]), m.cos(orb["omega"]), 0],
                                     [0, 0, 1]]))

            # Ensure x, y, z are NumPy arrays and not nested lists
            x = []
            y = []
            z = []
            for i in np.linspace(0, 2 * m.pi, 100):
                P = np.matmul(R, np.array([[orb["a"] * m.cos(i)],
                                         [orb["b"] * m.sin(i)],
                                         [0]])) - np.matmul(R, np.array([[orb["c"]],
                                                                         [0],
                                                                         [0]]))
                x.append(P[0][0])  # Extract the value from the nested array
                y.append(P[1][0])  # Extract the value from the nested array
                z.append(P[2][0])  # Extract the value from the nested array

            x = np.array(x)
            y = np.array(y)
            z = np.array(z)


            line.set_data(x[:frame], y[:frame])
            line.set_3d_properties(z[:frame])

            # Collect current position for collision detection
            if frame > 0:
                current_pos = (x[frame-1], y[frame-1], z[frame-1])
                positions.append((sat_name, current_pos))

        # Collision detection
        if not collision_detected and len(positions) > 1:
            for i in range(len(positions)):
                for j in range(i+1, len(positions)):
                    sat1, pos1 = positions[i]
                    sat2, pos2 = positions[j]
                    distance = np.linalg.norm(np.array(pos1) - np.array(pos2))
                    if distance < COLLISION_THRESHOLD:
                        print(f"Collision detected between {sat1} and {sat2} at distance {distance:.2f} km!")
                        collision_detected = True
                        collision_text.set_text(f"COLLISION: {sat1} & {sat2}")
                        # Pause animation by not updating further
                        break
                if collision_detected:
                    break

        return lines + [collision_text]

    ani = FuncAnimation(fig, update, frames=100, init_func=init, blit=True)

    plt.title("Orbits plotted in the ECE frame")
    if len(data) < 5:
        ax.legend()
    else:
        fig.subplots_adjust(right=0.8)
        ax.legend(loc='center left', bbox_to_anchor=(1.07, 0.5), fontsize=7)
        #A legend is added so we differentiate between the different satellite orbits

    return ani

# Define the TLE data as a dictionary
tle_data = {
    "LILACSAT-2": (
        '1 40908U 15049K   25040.75362640  .00014926  00000-0  44552-3 0  9999',
        '2 40908  97.5165  58.4844 0008714 220.7406 139.3186 15.34689321519828'
    ),
    "AO-07":(
        '1 07530U 74089B   25248.59614920 -.00000014  00000-0  20180-3 0  9990',
        '2 07530 101.9976 253.8073 0012015 315.7523 162.7217 12.53691377324855'
    ),
    # "Test-Sat": (
    #     '1 40908U 15049K   25040.75362640  .00014926  00000-0  44552-3 0  9999',
    #     '2 40908  97.5165  58.4844 0008714 220.7406 139.3186 15.34689321519828'
    # )
}

if __name__ == "__main__":
    # Only generate and display the animation when running this script directly.
    # Importing this module from the Flask app should not trigger plotting.
    ani = plot_tle(tle_data)
    try:
        # If running interactively (jupyter/ipython) or with a display, show HTML
        HTML(ani.to_jshtml())
    except Exception:
        # If HTML rendering isn't available (e.g. server environment), save a small preview
        try:
            ani.save('preview.gif', writer='pillow', fps=10)
        except Exception:
            pass