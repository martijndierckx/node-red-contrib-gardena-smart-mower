module.exports = (RED) => {
  "use strict";

  const errorTexts = {
    NO_MESSAGE: "Unknown error",
    OUTSIDE_WORKING_AREA: "Outside working area",
    NO_LOOP_SIGNAL: "No loop signal",
    WRONG_LOOP_SIGNAL: "Wrong loop signal",
    LOOP_SENSOR_PROBLEM_FRONT: "Front loop sensor problem",
    LOOP_SENSOR_PROBLEM_REAR: "Rear loop sensor problem",
    LOOP_SENSOR_PROBLEM_LEFT: "Left loop sensor problem",
    LOOP_SENSOR_PROBLEM_RIGHT: "Right loop sensor problem",
    WRONG_PIN_CODE: "Wrong PIN code",
    TRAPPED: "Trapped",
    UPSIDE_DOWN: "Upside down",
    EMPTY_BATTERY: "Empty battery",
    NO_DRIVE: "No drive",
    TEMPORARILY_LIFTED: "Temporarily lifted",
    LIFTED: "Lifted",
    STUCK_IN_CHARGING_STATION: "Stuck in charging station",
    CHARGING_STATION_BLOCKED: "Charging station blocked",
    COLLISION_SENSOR_PROBLEM_REAR: "Rear collision sensor problem",
    COLLISION_SENSOR_PROBLEM_FRONT: "Front collision sensor problem",
    WHEEL_MOTOR_BLOCKED_RIGHT: "Right wheel motor blocked",
    WHEEL_MOTOR_BLOCKED_LEFT: "Left wheel motor blocked",
    WHEEL_DRIVE_PROBLEM_RIGHT: "Right wheel drive problem",
    WHEEL_DRIVE_PROBLEM_LEFT: "Left wheel drive problem",
    CUTTING_MOTOR_DRIVE_DEFECT: "Cutting motor defect",
    CUTTING_SYSTEM_BLOCKED: "Cutting system blocked",
    INVALID_SUB_DEVICE_COMBINATION: "Invalid sub device combination",
    MEMORY_CIRCUIT_PROBLEM: "Memory circuit problem",
    CHARGING_SYSTEM_PROBLEM: "Charging system problem",
    STOP_BUTTON_PROBLEM: "Stop button problem",
    TILT_SENSOR_PROBLEM: "Tilt sensor problem",
    MOWER_TILTED: "Motor tilted",
    WHEEL_MOTOR_OVERLOADED_RIGHT: "Right wheel motor overloaded",
    WHEEL_MOTOR_OVERLOADED_LEFT: "Left wheel motor overloaded",
    CHARGING_CURRENT_TOO_HIGH: "Charging current too high",
    ELECTRONIC_PROBLEM: "Electronic problem",
    CUTTING_MOTOR_PROBLEM: "Cutting motor problem",
    LIMITED_CUTTING_HEIGHT_RANGE: "Limited cutting height range",
    CUTTING_HEIGHT_PROBLEM_DRIVE: "Cutting height problem drive",
    CUTTING_HEIGHT_PROBLEM_CURR: "Cutting height problem current",
    CUTTING_HEIGHT_PROBLEM_DIR: "Curring height problem direction",
    CUTTING_HEIGHT_BLOCKED: "Cutting height blocked",
    CUTTING_HEIGHT_PROBLEM: "Cutthing height problem",
    BATTERY_PROBLEM: "Battery problem",
    TOO_MANY_BATTERIES: "Too many batteries",
    ALARM_MOWER_SWITCHED_OFF: "Motor switched off",
    ALARM_MOWER_STOPPED: "Mower stopped",
    ALARM_MOWER_LIFTED: "Mower lifted",
    ALARM_MOWER_TILTED: "Mower tilted",
    ALARM_MOWER_IN_MOTION: "Mower in motion",
    ALARM_OUTSIDE_GEOFENCE: "Outside geofence",
    SLIPPED: "Slipped",
    INVALID_BATTERY_COMBINATION: "Invalid battery combination",
    UNINITIALISED: "Uniniatialised",
    WAIT_UPDATING: "Updating mower",
    WAIT_POWER_UP: "Powering up",
    OFF_DISABLED: "Mower off",
    OFF_HATCH_OPEN: "Hatch open",
    OFF_HATCH_CLOSED: "Mower off",
    PARKED_DAILY_LIMIT_REACHED: "Daily mowing limit reached",
  };

  import("gardena-smart-system").then(
    ({ GardenaMower, GardenaMowerState, GardenaMowerActivity }) => {
      // Class
      class GardenaMowerNode {
        constructor(n) {
          RED.nodes.createNode(this, n);
          this.mower = n.mower;
          this.config = n.config;
          this.configNode = RED.nodes.getNode(this.config);

          let node = this;

          // Reset status
          const disconnectedState = {
            fill: "grey",
            shape: "ring",
            text: "Not connected",
          };
          node.status(disconnectedState);

          // Config node linked?
          if (!this.configNode) return;

          // On input message received
          node.on("input", async (msg) => {
            try {
              if (node.gardenaDevice) {
                switch (msg.action) {
                  case "parkUntilFurtherNotice":
                    await node.gardenaDevice.parkUntilFurtherNotice();
                    break;
                  case "parkUntilNextTask":
                    await node.gardenaDevice.parkUntilNextTask();
                    break;
                  case "resumeSchedule":
                    await node.gardenaDevice.resumeSchedule();
                    break;
                  case "startMowing":
                    // Parse duration if provided
                    let minutes = undefined;
                    let parsedDuration = parseInt(msg.duration);
                    if (msg.duration && parsedDuration) {
                      minutes = parsedDuration;
                    }

                    // Execute command
                    await node.gardenaDevice.startMowing(minutes);
                    break;
                }
              }
            } catch (e) {}
          });

          // Event listener for device updates
          const updateListener = (updateList) => {
            let fill = "grey";
            let shape = "dot";
            let text = "";

            // Battery status func
            const batteryStatus = () => {
              return node.gardenaDevice.batteryLevel > 20
                ? `🔋${node.gardenaDevice.batteryLevel}%`
                : `🪫${node.gardenaDevice.batteryLevel}%`;
            };

            // Activity status func
            const activityStatus = () => {
              switch (node.gardenaDevice.activity) {
                case GardenaMowerActivity.Paused:
                  return `Paused - ${batteryStatus()}`;
                case GardenaMowerActivity.Cutting:
                  return `Cutting - ${batteryStatus()}`;
                case GardenaMowerActivity.Searching:
                  return `Searching - ${batteryStatus()}`;
                case GardenaMowerActivity.Leaving:
                  return `Leaving - ${batteryStatus()}`;
                case GardenaMowerActivity.Charging:
                  return `Charging - ${batteryStatus()}`;
                case GardenaMowerActivity.Parked:
                  return `Parked - ${batteryStatus()}`;
                case GardenaMowerActivity.ParkedManual:
                  return `Manually parked - ${batteryStatus()}`;
                case GardenaMowerActivity.ParkedInsufficientGrassHeight:
                  return `Parked until grass grows - ${batteryStatus()}`;
                default:
                  return `${batteryStatus()}`;
              }
            };

            // Determine status
            switch (node.gardenaDevice.state) {
              case GardenaMowerState.Ok:
                fill = "green";
                text = activityStatus();
                break;
              case GardenaMowerState.Warning:
                fill = "yellow";
                text = errorTexts[node.gardenaDevice.error] ?? "";
                break;
              case GardenaMowerState.Error:
                fill = "red";
                text = errorTexts[node.gardenaDevice.error] ?? "";
                break;
              default:
                shape = "ring";
                break;
            }

            // Set node status
            node.status({
              fill,
              shape,
              text,
            });

            // Send message with updated values
            node.send({
              mower: {
                id: node.gardenaDevice.id,
                name: node.gardenaDevice.name,
              },
              payload: {
                state: node.gardenaDevice.state,
                stateTs: node.gardenaDevice.stateTs
                  ? node.gardenaDevice.stateTs.toDate()
                  : undefined,
                activity: node.gardenaDevice.activity,
                activityTs: node.gardenaDevice.stateTs
                  ? node.gardenaDevice.stateTs.toDate()
                  : undefined,
                lastErrorCode: node.gardenaDevice.lastErrorCode,
                lastErrorCodeTs: node.gardenaDevice.lastErrorCodeTs
                  ? node.gardenaDevice.lastErrorCodeTs.toDate()
                  : undefined,
                operatingHours: node.gardenaDevice.operatingHours,
                batteryLevel: node.gardenaDevice.batteryLevel,
                batteryLevelTs: node.gardenaDevice.batteryLevelTs
                  ? node.gardenaDevice.batteryLevelTs.toDate()
                  : undefined,
                batteryState: node.gardenaDevice.batteryState,
                batteryStateTs: node.gardenaDevice.batteryStateTs
                  ? node.gardenaDevice.batteryStateTs.toDate()
                  : undefined,
                rfLinkLevel: node.gardenaDevice.rfLinkLevel,
                rfLinkLevelTs: node.gardenaDevice.rfLinkLevelTs
                  ? node.gardenaDevice.rfLinkLevelTs.toDate()
                  : undefined,
                rfLinkState: node.gardenaDevice.rfLinkState,
              },
              updatesList: updateList,
            });
          };

          // Listen for device list change on the config node
          this.configNode.on("devices-changed", () => {
            for (const dev of this.configNode.gardenaDevices) {
              if (dev.id == this.mower) {
                node.gardenaDevice = dev;

                // Listen for device updates
                node.gardenaDevice.on("wsUpdate", updateListener);
              }
            }
          });

          // Disconnect
          node.disconnect = () => {
            try {
              if (this.gardenaDevice) {
                node.gardenaDevice.off("wsUpdate", updateListener);
                node.gardenaDevice = null;
                node.status(disconnectedState);
              }
            } catch (e) {}
          };

          // Listen for disconnect event on config node or local close event
          node.configNode.on("disconnect", node.disconnect);
          node.on("close", node.disconnect);
        }
      }

      RED.httpAdmin.get("/gardena-smart-mower/get-mowers", async (req, res) => {
        try {
          const configNodeId = req.query.configNodeId;
          const configNode = RED.nodes.getNode(configNodeId);

          // Config node found
          if (!configNode) {
            return res.sendStatus(400);
          }

          // Extract id+name of each mower
          const mowersList = [];
          for (const dev of configNode.gardenaDevices) {
            if (dev instanceof GardenaMower) {
              mowersList.push({
                id: dev.id,
                name: dev.name,
              });
            }
          }

          // Send
          return res.json(mowersList);
        } catch (e) {
          return res.sendStatus(400);
        }
      });

      RED.nodes.registerType("gardena-mower", GardenaMowerNode);
    }
  );
};
