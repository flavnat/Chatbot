import React from "react";
import {
    FileTextOutlined,
    LinkOutlined,
    VideoCameraOutlined,
} from "@ant-design/icons";
import {
    ResourcesContainer,
    ResourcesGrid,
    ResourceCard,
    SuggestedResources,
} from "../ChatBotWidget.styles";
import { learningResources, helpResources } from "../chatBotData";

const ResourcesTab = () => {
    const renderResourceIcon = (type) => {
        switch (type) {
            case "documentation":
                return <FileTextOutlined />;
            case "guide":
                return <FileTextOutlined />;
            case "video":
                return <VideoCameraOutlined />;
            default:
                return <LinkOutlined />;
        }
    };

    return (
        <ResourcesContainer>
            <ResourcesGrid>
                {learningResources.map((resource, index) => (
                    <ResourceCard key={resource.id || index}>
                        <div className="resource-icon">
                            {resource.icon === "VideoCameraOutlined" ? (
                                <VideoCameraOutlined />
                            ) : (
                                <VideoCameraOutlined />
                            )}
                        </div>
                        <h5>{resource.title}</h5>
                        <p>{resource.description}</p>

                        {resource.type === "video" &&
                            (() => {
                                const videoId = resource.url.split("/").pop();
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                return (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            marginTop: "8px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "80px",
                                                background: "#f0f0f0",
                                                borderRadius: "6px",
                                                marginBottom: "6px",
                                                cursor: "pointer",
                                                overflow: "hidden",
                                                position: "relative",
                                            }}
                                            onClick={() =>
                                                window.open(
                                                    resource.url.replace(
                                                        "embed/",
                                                        "watch?v="
                                                    ),
                                                    "_blank"
                                                )
                                            }
                                        >
                                            <img
                                                src={thumbnailUrl}
                                                alt={resource.title}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    borderRadius: "6px",
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display =
                                                        "none";
                                                    e.target.nextElementSibling.style.display =
                                                        "flex";
                                                }}
                                            />
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform:
                                                        "translate(-50%, -50%)",
                                                    display: "none",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "100%",
                                                    height: "100%",
                                                }}
                                            >
                                                <VideoCameraOutlined
                                                    style={{
                                                        fontSize: "24px",
                                                        color: "#1890ff",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <a
                                            href={resource.url.replace(
                                                "embed/",
                                                "watch?v="
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: "11px",
                                                color: "#1890ff",
                                                textDecoration: "none",
                                                display: "block",
                                            }}
                                        >
                                            Watch on YouTube →
                                        </a>
                                    </div>
                                );
                            })()}

                        {(resource.type === "document" ||
                            resource.type === "link") && (
                            <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-link"
                            >
                                {resource.type === "document"
                                    ? "Open Document"
                                    : "Explore"}{" "}
                                {resource.type === "document" ? (
                                    <FileTextOutlined />
                                ) : (
                                    <LinkOutlined />
                                )}
                            </a>
                        )}
                    </ResourceCard>
                ))}
            </ResourcesGrid>

            <SuggestedResources>
                <h5>Suggested for you</h5>
                <div className="resource-list">
                    {helpResources.map((resource) => (
                        <div
                            key={resource.id}
                            className={`resource-item ${
                                resource.read ? "read" : ""
                            }`}
                        >
                            <div className="resource-type">
                                {renderResourceIcon(resource.type)}
                            </div>
                            <span style={{ marginInline: "1rem" }}>
                                {resource.title}
                            </span>
                            {!resource.read && (
                                <div className="unread-indicator"></div>
                            )}
                        </div>
                    ))}
                </div>
            </SuggestedResources>
        </ResourcesContainer>
    );
};

export default ResourcesTab;
