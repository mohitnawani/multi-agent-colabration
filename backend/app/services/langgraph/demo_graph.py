from langgraph.graph import StateGraph, START, END
from typing import Annotated, TypedDict
import operator

class DemoState(TypedDict):
    messages: Annotated[list, operator.add]

def greet_node(state): return {"messages": ["Hello from Agent A 👋"]}
def shout_node(state): return {"messages": ["HELLO FROM AGENT B 📣"]}

builder = StateGraph(DemoState)
builder.add_node("greet", greet_node)
builder.add_node("shout", shout_node)
builder.add_edge(START, "greet")   # entry wire
builder.add_edge("greet", "shout") # fixed wire
builder.add_edge("shout", END)     # exit wire

graph = builder.compile()

print(graph.invoke({"messages": []}))