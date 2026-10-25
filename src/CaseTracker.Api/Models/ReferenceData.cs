namespace CaseTracker.Api.Models;

// Fixed lists, mirrored in the frontend; there's no lookup endpoint.
public static class ReferenceData
{
    public static readonly string[] Agents = ["Amy", "John", "Sam"];

    public static readonly string[] Customers =
    [
        "Great Lakes Planning Assn.",
        "Harborview Mutual Insurance",
        "Keystone Mechanical Contractors",
        "Lakeshore Community Foundation",
        "Midwest Fastener Co.",
        "Prairie Valve & Pump",
    ];
}
