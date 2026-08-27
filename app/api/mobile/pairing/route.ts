import os from "node:os";

export const runtime = "nodejs";

function getLocalIp() {
    const interfaces = os.networkInterfaces();

    const addresses: string[] = [];

    for (const networkInterface of Object.values(interfaces)) {
        if (!networkInterface) {
            continue;
        }

        for (const address of networkInterface) {
            if (
                address.family === "IPv4" &&
                !address.internal
            ) {
                addresses.push(address.address);
            }
        }
    }

    // On privilégie les réseaux domestiques classiques.
    return (
        addresses.find((ip) =>
            ip.startsWith("192.168.")
        ) ??
        addresses.find((ip) =>
            ip.startsWith("10.")
        ) ??
        addresses.find((ip) => {
            const parts = ip.split(".").map(Number);

            return (
                parts[0] === 172 &&
                parts[1] >= 16 &&
                parts[1] <= 31
            );
        }) ??
        addresses[0] ??
        null
    );
}

export async function GET(request: Request) {
    const ip = getLocalIp();

    if (!ip) {
        return Response.json(
            {
                success: false,
                message: "Aucune adresse réseau locale trouvée.",
            },
            {
                status: 500,
            },
        );
    }

    const requestUrl = new URL(request.url);

    const port =
        requestUrl.port ||
        process.env.PORT ||
        "3000";

    const baseUrl = `http://${ip}:${port}`;

    return Response.json({
        success: true,
        baseUrl,
    });
}