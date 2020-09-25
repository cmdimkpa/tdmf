

# The Pipelines section. Pipelines group related components together by piping the output
# of one component into the input of another. This is a good place to write your
# package / unit tests as well as initialize your flags. Package tests check that the input
# received by a component is of the right specification and unit tests check that expected
# inputs into a component produce the expected output.

flags.set('pf_settings', [100, "PF"])
flags.set('inv_pf_settings', [100, "InvPF"])
flags.set('rr_fifo_settings', [100, "RR_FIFO"])
flags.set('rr_random_settings', [100, "RR_random"])
flags.set('hybrid_inv_pf_fifo_settings', [100, "Hybrid_InvPF_FIFO"])
flags.set('broadcast_settings', [1000, 5])
flags.set('run_interval', [1800])

CreateProportionalFairNetwork = Pipeline([
    ("create_network", "fetch_flag_inline('pf_settings')"),
])

CreateInverseProportionalFairNetwork = Pipeline([
    ("create_network", "fetch_flag_inline('inv_pf_settings')"),
])

CreateRoundRobinFIFONetwork = Pipeline([
    ("create_network", "fetch_flag_inline('rr_fifo_settings')"),
])

CreateRoundRobinRandomNetwork = Pipeline([
    ("create_network", "fetch_flag_inline('rr_random_settings')"),
])

CreateInvPFCrossFIFONetwork = Pipeline([
    ("create_network", "fetch_flag_inline('hybrid_inv_pf_fifo_settings')"),
])

GenerateNetworkTraffic = Pipeline([
    ("broadcast", "fetch_flag_inline('broadcast_settings')"),
])

RunNetworkSimulation = Pipeline([
    ("network_simulator", "fetch_flag_inline('run_interval')"),
])

Terminate = Pipeline([
    ("Pass", [])
])

