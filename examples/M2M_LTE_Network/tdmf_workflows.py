

# Workflows allow you to compose complete applications by grouping related pipelines together.
# The output of one pipeline flows into the next, and through context switching you can redirect
# application flow based on boolean flags. Workflows can also be looped to run for a definite
# number of cycles.

NetworkType = 5

NetworkAnalysis = Workflow([
    context_switch([
        (NetworkType == 1, "CreateProportionalFairNetwork"),
        (NetworkType == 2, "CreateRoundRobinFIFONetwork"),
        (NetworkType == 3, "CreateRoundRobinRandomNetwork"),
        (NetworkType == 4, "CreateInverseProportionalFairNetwork"),
        (NetworkType == 5, "CreateInvPFCrossFIFONetwork")
    ], "Terminate"),
    "GenerateNetworkTraffic",
    "RunNetworkSimulation"
])

