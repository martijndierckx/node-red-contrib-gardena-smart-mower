module.exports = (RED) => {
  "use strict";
  import("gardena-smart-system").then(
    ({ default: GardenaConnection, GardenaWrongCredentialsError }) => {
      // Class
      class GardenaMowerConfigNode {
        constructor(n) {
          RED.nodes.createNode(this, n);
          this.location = n.location;
          let node = this;

          node.connect = async () => {
            try {
              // Connect to Gardena
              node.gardenaConnection = new GardenaConnection({
                clientId: node.credentials.clientid,
                clientSecret: node.credentials.clientsecret,
              });

              // Get devices list
              node.gardenaDevices = await node.gardenaConnection.getDevices(
                node.location
              );
              
              // Inform other gardena nodes
              node.emit('devices-changed');

              // Start receiving events
              await node.gardenaConnection.activateRealtimeUpdates(node.location);
            } catch (e) {
              // todo: handle
            }
          };

          node.disconnect = async () => {
            try {
              if (node.gardenaConnection) {
                await node.gardenaConnection.deactivateRealtimeUpdates(
                  node.location
                );
                node.emit('disconnect');
              }
            } catch (e) {
              // todo: handle
            }
          };

          // main
          if (node.credentials.clientid &&
            node.credentials.clientsecret &&
            node.location) {
            node.connect();
          }

          // close
          node.on("close", async () => {
            await node.disconnect();
          });
        }
      }

      RED.httpAdmin.get(
        "/gardena-smart-mower/get-locations",
        async (req, res) => {
          try {
            if (!req.query.clientid || !req.query.clientsecret) {
              return res.sendStatus(400);
            }

            // Retrieve locations list
            let locations = [];
            try {
              const gardena = new GardenaConnection({
                clientId: req.query.clientid,
                clientSecret: req.query.clientsecret,
              });
              locations = await gardena.getLocations();
            } catch (e) {
              // Wrong credentials?
              while (e.cause) {
                if (e.cause instanceof GardenaWrongCredentialsError) {
                  return res.sendStatus(401);
                }
                e = e.cause;
              }
            }

            // Extract id+name of each location
            const locationsList = [];
            for (const loc of locations) {
              locationsList.push({
                id: loc.id,
                name: loc.name,
              });
            }

            // Send
            return res.json(locationsList);
          } catch (e) {
            return res.sendStatus(400);
          }
        }
      );

      RED.nodes.registerType("gardena-mower-config", GardenaMowerConfigNode, {
        credentials: {
          clientid: { type: "text" },
          clientsecret: { type: "text" },
        },
      });
    }
  );
};
