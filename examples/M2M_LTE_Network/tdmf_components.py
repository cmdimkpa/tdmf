

# This section is for your project components (functions and classes). Components should be atomic
# and do exactly one thing. Write your tests in the Pipelines section and use flags to manage mutable
# state and message passing between your components. Components must always receive an array package
# and return an array.

from time import sleep
from random import random
from math import exp

flags.set("requests", {})

def Pass(package):
    return [None]
    
def safely_divide(a, b):
    try:
        return a/b
    except:
        return 0

def avg(array):
    return safely_divide(sum(array), len(array))

def fetch_random(array):
    if array:
        ptr = int(random()*len(array))
        return array[ptr]
    else:
        return None
    
def normalize(array, invert=False):
    def to_factor(a, b):
        if invert:
            a = 1 / a
            b = 1 / b
        return 1 + exp(a/b - 1)
    if array:
        max_ = max(array)
        array = [to_factor(x, max_) for x in array]
    return array

def combine(array1, array2):
    def to_factor(p, q):
        return (p*q)/(p+q)
    return [to_factor(p, array2[array1.index(p)]) for p in array1]

class Transmission:
    '''
        a network transmission
    '''
    def __init__(self, source_id, packet_size):
        self.source_id = source_id
        self.packet_size = packet_size
        self.started = None
        self.delay = None
        
    def ping(self):
        if self.packet_size > 0:
            self.packet_size -= 1
            tr_reqs = flags.get("trans_requests")
            tr_reqs[self.source_id] += 1
            flags.set("trans_requests", tr_reqs)
        reqs = flags.get("requests")
        reqs[self.source_id] = self.packet_size
        flags.set("requests", reqs)

    def send(self):
        self.started = now()
        sending = [self.ping() for i in range(self.packet_size)]
        self.delay = elapsed_secs(self.started)

class Log:
    '''
        logging machine transmissions
    '''
    def __init__(self):
        self.history = {}
    def update(self, trans):
        ps = flags.get("trans_requests")[trans.source_id]
        if trans.source_id not in self.history:
            self.history[trans.source_id] = {
                "size" : [ps],
                "delay" : [trans.delay],
                "avg_throughput" : [safely_divide(ps, trans.delay)]
            }
        else:
            self.history[trans.source_id]["size"].append(ps)
            self.history[trans.source_id]["delay"].append(trans.delay)
            self.history[trans.source_id]["avg_throughput"].append(safely_divide(avg(
                self.history[trans.source_id]["size"]), avg(self.history[trans.source_id]["delay"])))

class ResourceBlock:
    '''
        communication channel on the network
    '''
    def __init__(self, number):
        self.number = number
        self.canAllocate = False # network resource_blocks are closed by default
        self.log = Log()

    def allocate(self, scheduler):
        if self.canAllocate:
            reqs = flags.get("requests") #{ source_id : packet_size, ... }
            best = None
            if scheduler == "PF":
                # use Proportional Fair scheduler
                highest = 0
                for source_id in reqs:
                    if source_id in self.log.history:
                        tp = max(self.log.history[source_id]["avg_throughput"])
                        # select highest average throughput
                        if tp > highest:
                            highest = tp
                            best = source_id
                    else:
                        best = source_id
            if scheduler == "InvPF":
                # use Inverted Proportional Fair scheduler
                lowest = float('inf')
                for source_id in reqs:
                    if source_id in self.log.history:
                        tp = min(self.log.history[source_id]["avg_throughput"])
                        # select lowest average throughput
                        if tp < lowest:
                            lowest = tp
                            best = source_id
                    else:
                        best = source_id
            if scheduler == "RR_FIFO":
                # use Round Robin scheduler (FIFO Mode)
                try:
                    devices = [x for x in reqs.keys()]
                    devices.sort()
                    best = devices[0]
                except:
                    pass
            if scheduler == "RR_random":
                # use Round Robin scheduler (Random Mode)
                try:
                    best = fetch_random([x for x in reqs.keys()])
                except:
                    pass
            if scheduler == "Hybrid_InvPF_FIFO":
                # use Hybrid Inverse Proportional Crossed with Round Robin FIFO
                highest = 0
                base0 = [x for x in self.log.history.keys()]
                base0.sort()
                inverse_cqi = \
                normalize([max(self.log.history[source_id]["avg_throughput"])\
                           for source_id in base0], invert=True)
                order_of_arrival = normalize([(len(base0) - x) for x in base0], invert=False)
                prioritization_metric = combine(inverse_cqi, order_of_arrival)
                for source_id in reqs:
                    if source_id in self.log.history:
                        tp = prioritization_metric[base0.index(source_id)]
                        # select highest prioritization metric
                        if tp > highest:
                            highest = tp
                            best = source_id
                    else:
                        best = source_id
            # make selection and mutate requests flag
            try:
                packet_size = reqs[best]
                del reqs[best]
                flags.set("requests", reqs)
            except:
                pass
            if best and packet_size:
                # start transmission
                self.canAllocate = False # close resource_block during transmission
                transmission = Transmission(best, packet_size)
                transmission.send()
                # transmission finished, update log
                self.log.update(transmission)
                self.canAllocate = True # open resource_block for new allocation

    def allow(self):
        self.canAllocate = True

    def stats(self):
        total_packet_size = sum([max(self.log.history[device_id]["size"]) for device_id  in self.log.history])
        total_packet_delay = sum([max(self.log.history[device_id]["delay"]) for device_id  in self.log.history])
        average_throughput = safely_divide(total_packet_size, total_packet_delay)
        return [total_packet_size, total_packet_delay, average_throughput]

class Device:
    '''
        Network device model
    '''
    def __init__(self, id):
        self.id = id
        self.base_bits = 100
        self.min_bits = id*self.base_bits
        self.max_bits = (id + 1)*self.base_bits
        self.send_bits = 0

    def try_uplink(self):
        self.send_bits = int(self.min_bits + random()*(self.max_bits - self.min_bits))
        # add to requests flag
        requests = flags.get("requests")
        if requests:
            if self.id in requests:
                requests[self.id] += self.send_bits
            else:
                requests[self.id] = self.send_bits
        else:
            requests = {}
            requests[self.id] = self.send_bits
        flags.set("requests", requests)
    
class Network:
    '''
        Network model
    '''
    def __init__(self, size, scheduler):
        self.size = size
        self.scheduler = scheduler
        self.resource_blocks = [ResourceBlock(i) for i in range(self.size)]
        self.current_block = -1
        self.perf_data = {}

    def open_resource_blocks(self, selection):
        if selection == "*":
            selection = [i for i in range(self.size)]
        for i in selection:
            self.resource_blocks[i].allow()

    def scan(self):
        self.current_block += 1
        if self.current_block == self.size:
            self.current_block = 0
        return self.current_block

    def allocate(self, started, run_for):
        if elapsed_secs(started) < run_for and flags.get("requests"):
            self.resource_blocks[self.scan()].allocate(self.scheduler)
            sleep(0.001) # 1ms TTI
            self.allocate(started, run_for)
        else:
            return

    def stats(self):
        self.perf_data["resource_block_stats"] = [ self.resource_blocks[i].stats() for i in range(self.size) ]
        total_packet_size = sum([ stat[0] for stat in self.perf_data["resource_block_stats"] ])
        total_packet_delay = sum([ stat[1] for stat in self.perf_data["resource_block_stats"] ])
        self.perf_data["total_packet_size"] = total_packet_size
        self.perf_data["total_packet_delay"] = total_packet_delay
        self.perf_data["average_throughput"] = safely_divide(total_packet_size, total_packet_delay)

def broadcast(package):
    '''
        create network devices and broadcast messages
    '''
    n_devices, n_turns = package
    for i in range(n_devices):
        device = Device(i)
        for j in range(n_turns):
            device.try_uplink()
    rq = flags.get("requests")
    flags.set("trans_requests", { key : 0 for key in rq })
    return [ 0 ]

def create_network(package):
    '''
        create a network
    '''
    size, scheduler = package
    network = Network(size, scheduler)
    flags.set("active_network", network)
    return [ network ]

def network_simulator(package):
    '''
        run the network simulation
    '''
    
    try:
        run_for = package[0]
    
        # retrieve active network
        network = flags.get("active_network")

        # open all resource blocks
        network.open_resource_blocks("*")


        # start network allocation loop
        started = now()
        try:
            network.allocate(started, run_for)
        except:
            pass

        # load finished network
        flags.set("finished_network", network)
    except:
        pass
    return [ 0 ]
    
